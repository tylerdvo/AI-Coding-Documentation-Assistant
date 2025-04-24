// src/codeParser.ts
import * as vscode from 'vscode';
import { Logger } from './utils/logger';

export interface FunctionInfo {
    name: string;
    signature: string;
    body: string;
    startLine: number;
    endLine: number;
    language: string;
    existingDocumentation?: string;
}

export class CodeParser {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('CodeParser');
    }

    /**
     * Find the function at the current cursor position
     * @param document The active text document
     * @param position The current cursor position
     * @returns Information about the function or null if no function is found
     */
    public findFunctionAtPosition(
        document: vscode.TextDocument,
        position: vscode.Position
    ): FunctionInfo | null {
        const language = document.languageId;
        
        // Get the whole document text
        const text = document.getText();
        
        // Get the current line and its text
        const line = position.line;
        const lineText = document.lineAt(line).text;
        
        this.logger.info(`Attempting to find function at line ${line}, language: ${language}`);

        // Parsing strategy based on language
        switch (language) {
            case 'javascript':
            case 'typescript':
            case 'typescriptreact':
            case 'javascriptreact':
                return this.findJavaScriptFunction(document, position);
                
            case 'python':
                return this.findPythonFunction(document, position);
                
            case 'java':
            case 'csharp':
            case 'cpp':
            case 'c':
                return this.findCStyleFunction(document, position);
                
            default:
                // Generic function finder as fallback
                return this.findGenericFunction(document, position);
        }
    }

    /**
     * Find JavaScript/TypeScript function at the given position
     * @param document The active text document
     * @param position The current cursor position
     * @returns Information about the JavaScript/TypeScript function or null if no function is found
     */
    private findJavaScriptFunction(
        document: vscode.TextDocument,
        position: vscode.Position
    ): FunctionInfo | null {
        const text = document.getText();
        const language = document.languageId;
        const currentLine = position.line;
        
        // Create regex patterns for different function types
        const functionPatterns = [
            // Function declaration: function name(params) { ... }
            /function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*{/g,
            
            // Arrow function: const name = (params) => { ... }
            /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*{/g,
            
            // Method in class or object: name(params) { ... }
            /([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*{/g,
            
            // Class method: methodName(params) { ... }
            /(?:public|private|protected)?\s*(?:static)?\s*(?:async)?\s*([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*{/g
        ];
        
        // Split the document into lines for processing
        const lines = text.split('\n');
        
        // Look for function patterns around the current position
        for (let i = currentLine; i >= Math.max(0, currentLine - 10); i--) {
            const lineText = lines[i];
            
            for (const pattern of functionPatterns) {
                pattern.lastIndex = 0; // Reset regex state
                const match = pattern.exec(lineText);
                
                if (match) {
                    const functionName = match[1];
                    const functionSignature = lineText.trim();
                    
                    // Find the function body and its boundaries
                    const { body, startLine, endLine } = this.findFunctionBody(document, i);
                    
                    // Check for existing documentation
                    const existingDocumentation = this.findExistingDocumentation(document, startLine);
                    
                    this.logger.info(`Found JavaScript/TypeScript function: ${functionName} at line ${startLine}`);
                    
                    return {
                        name: functionName,
                        signature: functionSignature,
                        body: body,
                        startLine: startLine,
                        endLine: endLine,
                        language: language,
                        existingDocumentation: existingDocumentation
                    };
                }
            }
        }
        
        return null;
    }

    /**
     * Find Python function at the given position
     * @param document The active text document
     * @param position The current cursor position
     * @returns Information about the Python function or null if no function is found
     */
    private findPythonFunction(
        document: vscode.TextDocument,
        position: vscode.Position
    ): FunctionInfo | null {
        const text = document.getText();
        const lines = text.split('\n');
        const currentLine = position.line;
        
        // Python function pattern: def name(params):
        const functionPattern = /^\s*def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:->.*?)?:/;
        
        // Look for function definition
        for (let i = currentLine; i >= Math.max(0, currentLine - 10); i--) {
            const lineText = lines[i];
            const match = functionPattern.exec(lineText);
            
            if (match) {
                const functionName = match[1];
                const functionSignature = lineText.trim();
                
                // Find the function body and its boundaries
                let startLine = i;
                let endLine = i;
                let body = '';
                
                // Determine the indentation level of the function definition
                const defIndent = lineText.search(/\S/);
                
                // Collect the function body by following lines with greater indentation
                for (let j = i + 1; j < lines.length; j++) {
                    const bodyLine = lines[j];
                    
                    // Empty lines are part of the function
                    if (bodyLine.trim() === '') {
                        body += bodyLine + '\n';
                        endLine = j;
                        continue;
                    }
                    
                    const lineIndent = bodyLine.search(/\S/);
                    
                    // If indentation is less than or equal to the function definition,
                    // we've reached the end of the function
                    if (lineIndent <= defIndent && lineIndent !== -1) {
                        break;
                    }
                    
                    body += bodyLine + '\n';
                    endLine = j;
                }
                
                // Check for existing docstring
                const existingDocumentation = this.findPythonDocstring(document, startLine, lines);
                
                this.logger.info(`Found Python function: ${functionName} at line ${startLine}`);
                
                return {
                    name: functionName,
                    signature: functionSignature,
                    body: body,
                    startLine: startLine,
                    endLine: endLine,
                    language: 'python',
                    existingDocumentation: existingDocumentation
                };
            }
        }
        
        return null;
    }

    /**
     * Find C-style function (Java, C#, C++, C) at the given position
     * @param document The active text document
     * @param position The current cursor position
     * @returns Information about the C-style function or null if no function is found
     */
    private findCStyleFunction(
        document: vscode.TextDocument,
        position: vscode.Position
    ): FunctionInfo | null {
        const text = document.getText();
        const language = document.languageId;
        const lines = text.split('\n');
        const currentLine = position.line;
        
        // C-style function pattern (simplified)
        // This handles signatures like: 
        // public static void main(String[] args) {
        // int add(int a, int b) {
        const functionPattern = /^\s*(public|private|protected)?\s*(static)?\s*([A-Za-z0-9_<>[\]]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[A-Za-z0-9_,\s]+)?\s*{/;
        
        // Look for function definition
        for (let i = currentLine; i >= Math.max(0, currentLine - 10); i--) {
            const lineText = lines[i];
            const match = functionPattern.exec(lineText);
            
            if (match) {
                const functionName = match[4];
                const functionSignature = lineText.trim();
                
                // Find the function body and its boundaries
                const { body, startLine, endLine } = this.findFunctionBody(document, i);
                
                // Check for existing documentation
                const existingDocumentation = this.findExistingDocumentation(document, startLine);
                
                this.logger.info(`Found C-style function: ${functionName} at line ${i}`);
                
                return {
                    name: functionName,
                    signature: functionSignature,
                    body: body,
                    startLine: i,
                    endLine: endLine,
                    language: language,
                    existingDocumentation: existingDocumentation
                };
            }
        }
        
        return null;
    }

    /**
     * Generic function finder for unsupported languages
     * @param document The active text document
     * @param position The current cursor position
     * @returns Basic function information or null if no function-like structure is found
     */
    private findGenericFunction(
        document: vscode.TextDocument,
        position: vscode.Position
    ): FunctionInfo | null {
        const text = document.getText();
        const language = document.languageId;
        const currentLine = position.line;
        
        // Generic pattern to detect function-like structures
        // This is a best-effort approach for unsupported languages
        const functionPattern = /([A-Za-z0-9_]+)\s*\(([^)]*)\)/;
        
        // Look for pattern near the cursor position
        for (let i = currentLine; i >= Math.max(0, currentLine - 5); i--) {
            const lineText = document.lineAt(i).text;
            const match = functionPattern.exec(lineText);
            
            if (match) {
                const functionName = match[1];
                
                // Try to find a function body by looking for braces
                const { body, startLine, endLine } = this.findFunctionBody(document, i);
                
                this.logger.info(`Found generic function-like structure: ${functionName} at line ${i}`);
                
                return {
                    name: functionName,
                    signature: lineText.trim(),
                    body: body,
                    startLine: startLine,
                    endLine: endLine,
                    language: language,
                    existingDocumentation: this.findExistingDocumentation(document, startLine)
                };
            }
        }
        
        return null;
    }

    /**
     * Find the boundaries and content of a function body
     * @param document The text document
     * @param startLine The line where the function definition starts
     * @returns Object containing the function body, start line, and end line
     */
    private findFunctionBody(
        document: vscode.TextDocument,
        startLine: number
    ): { body: string; startLine: number; endLine: number } {
        const text = document.getText();
        const lines = text.split('\n');
        const lineText = lines[startLine];
        
        let body = lineText + '\n';
        let braceCount = 0;
        let endLine = startLine;
        
        // Count opening braces in the first line
        for (let i = 0; i < lineText.length; i++) {
            if (lineText[i] === '{') {
                braceCount++;
            }
        }
        
        // If no opening brace found in the first line, look in subsequent lines
        if (braceCount === 0) {
            for (let i = startLine + 1; i < lines.length; i++) {
                const currentLine = lines[i];
                body += currentLine + '\n';
                endLine = i;
                
                if (currentLine.includes('{')) {
                    // Count opening braces
                    for (let j = 0; j < currentLine.length; j++) {
                        if (currentLine[j] === '{') {
                            braceCount++;
                        }
                    }
                    break;
                }
            }
        }
        
        // Continue until we find the matching closing brace
        for (let i = endLine + 1; i < lines.length && braceCount > 0; i++) {
            const currentLine = lines[i];
            body += currentLine + '\n';
            endLine = i;
            
            // Count braces to handle nested blocks
            for (let j = 0; j < currentLine.length; j++) {
                if (currentLine[j] === '{') {
                    braceCount++;
                } else if (currentLine[j] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        // We've found the matching closing brace
                        break;
                    }
                }
            }
        }
        
        return { body, startLine, endLine };
    }

    /**
     * Find existing documentation for a function
     * @param document The text document
     * @param functionStartLine The line where the function starts
     * @returns Existing documentation string or undefined if none is found
     */
    private findExistingDocumentation(
        document: vscode.TextDocument,
        functionStartLine: number
    ): string | undefined {
        const lines = document.getText().split('\n');
        
        // Look for documentation above the function (JSDoc, JavaDoc, etc.)
        let startLine = functionStartLine - 1;
        let docLines: string[] = [];
        
        // Skip empty lines
        while (startLine >= 0 && lines[startLine].trim() === '') {
            startLine--;
        }
        
        if (startLine < 0) {
            return undefined;
        }
        
        // Check for JSDoc/JavaDoc style (/**...*/)
        if (lines[startLine].trim().endsWith('*/')) {
            // Found the end of a doc comment, collect all lines
            let docEndLine = startLine;
            
            while (startLine >= 0) {
                const line = lines[startLine].trim();
                docLines.unshift(lines[startLine]);
                
                if (line.startsWith('/**')) {
                    // Found the start of the doc comment
                    return docLines.join('\n');
                }
                
                startLine--;
            }
        }
        
        return undefined;
    }

    /**
     * Find Python docstring for a function
     * @param document The text document
     * @param functionStartLine The line where the function starts
     * @param lines The document lines
     * @returns The docstring or undefined if none is found
     */
    private findPythonDocstring(
        document: vscode.TextDocument,
        functionStartLine: number,
        lines: string[]
    ): string | undefined {
        // Python docstrings are typically right after the function definition
        const functionLine = functionStartLine;
        
        // Check if the next line starts a docstring
        if (functionLine + 1 < lines.length) {
            const nextLine = lines[functionLine + 1].trim();
            
            // Check for triple quotes (''' or """)
            if (nextLine.startsWith('"""') || nextLine.startsWith("'''")) {
                let docLines: string[] = [lines[functionLine + 1]];
                let i = functionLine + 2;
                
                // Triple quotes can be on a single line or span multiple lines
                if (!(nextLine.endsWith('"""') && nextLine.length > 3) &&
                    !(nextLine.endsWith("'''") && nextLine.length > 3)) {
                    // Multi-line docstring
                    const quoteType = nextLine.startsWith('"""') ? '"""' : "'''";
                    
                    // Collect all lines until closing triple quotes
                    while (i < lines.length) {
                        docLines.push(lines[i]);
                        
                        if (lines[i].trim().endsWith(quoteType)) {
                            break;
                        }
                        
                        i++;
                    }
                }
                
                return docLines.join('\n');
            }
        }
        
        return undefined;
    }
}