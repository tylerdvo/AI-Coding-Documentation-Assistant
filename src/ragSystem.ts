import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class RAGSystem {
    private projectContextCache: Map<string, string> = new Map();

    /**
     * Extract context from project files
     * @param language Programming language
     * @returns Aggregated context string
     */
    public async extractProjectContext(language: string): Promise<string> {
        // Clear previous cache
        this.projectContextCache.clear();

        // Get the current workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return '';
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        try {
            // Recursive file search with language-specific filtering
            await this.searchFiles(workspaceRoot, language);

            // Aggregate context
            return this.aggregateContext();
        } catch (error) {
            console.error('Error extracting project context:', error);
            return '';
        }
    }

    /**
     * Search for relevant files in the project
     * @param directory Starting directory
     * @param language Target programming language
     */
    private async searchFiles(directory: string, language: string): Promise<void> {
        const languageExtensions = this.getLanguageFileExtensions(language);

        const files = await fs.promises.readdir(directory, { withFileTypes: true });

        for (const file of files) {
            const fullPath = path.join(directory, file.name);

            if (file.isDirectory()) {
                // Ignore common directories
                if (!this.shouldIgnoreDirectory(file.name)) {
                    await this.searchFiles(fullPath, language);
                }
            } else if (this.isRelevantFile(file.name, languageExtensions)) {
                try {
                    const fileContent = await fs.promises.readFile(fullPath, 'utf-8');
                    this.processFileContent(fullPath, fileContent);
                } catch (error) {
                    console.error(`Error reading file ${fullPath}:`, error);
                }
            }
        }
    }

    /**
     * Get file extensions for a given language
     * @param language Programming language
     * @returns Array of file extensions
     */
    private getLanguageFileExtensions(language: string): string[] {
        const extensionMap: { [key: string]: string[] } = {
            'javascript': ['.js', '.jsx'],
            'typescript': ['.ts', '.tsx'],
            'python': ['.py'],
            'java': ['.java'],
            'csharp': ['.cs'],
            'cpp': ['.cpp', '.h', '.hpp'],
            'c': ['.c', '.h']
        };

        return extensionMap[language] || [];
    }

    /**
     * Check if directory should be ignored during context extraction
     * @param dirName Directory name
     * @returns Boolean indicating whether to ignore
     */
    private shouldIgnoreDirectory(dirName: string): boolean {
        const ignoredDirs = [
            'node_modules', 
            '.git', 
            '.vscode', 
            'dist', 
            'build', 
            'out', 
            'target'
        ];
        return ignoredDirs.includes(dirName);
    }

    /**
     * Check if file is relevant for context extraction
     * @param fileName File name
     * @param extensions Allowed file extensions
     * @returns Boolean indicating file relevance
     */
    private isRelevantFile(fileName: string, extensions: string[]): boolean {
        return extensions.some(ext => fileName.endsWith(ext));
    }

    /**
     * Process file content and cache relevant context
     * @param filePath Full path to the file
     * @param content File content
     */
    private processFileContent(filePath: string, content: string): void {
        // Extract function and class declarations
        const contextExtractionPatterns = {
            'function': /(?:function\s+\w+\s*\(.*?\)|\w+\s*=\s*\(.*?\)\s*=>)\s*{/g,
            'class': /class\s+\w+\s*{/g,
            'method': /(?:public|private|protected)?\s*\w+\s*\(.*?\)\s*{/g
        };

        let contextSnippets: string[] = [];

        // Extract context snippets
        Object.values(contextExtractionPatterns).forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                // Limit context to a reasonable length
                const snippet = content.substring(
                    match.index || 0, 
                    Math.min((match.index || 0) + 500, content.length)
                );
                contextSnippets.push(snippet);
            }
        });

        // Cache context if snippets are found
        if (contextSnippets.length > 0) {
            this.projectContextCache.set(filePath, contextSnippets.join('\n\n'));
        }
    }

    /**
     * Aggregate cached context into a single string
     * @returns Aggregated context
     */
    private aggregateContext(): string {
        const maxContextLength = 2000; // Limit total context length
        let aggregatedContext = '';

        for (const [filePath, context] of this.projectContextCache) {
            // Add file path as a reference
            const contextWithReference = `// Context from ${path.basename(filePath)}:\n${context}\n\n`;
            
            // Check if adding this would exceed max length
            if ((aggregatedContext + contextWithReference).length > maxContextLength) {
                break;
            }

            aggregatedContext += contextWithReference;
        }

        return aggregatedContext.trim();
    }
}