import * as vscode from 'vscode';
import { OpenAIService } from './openaiService';
import { ContextExtractor } from './contextExtractor';
import { RAGSystem } from './ragSystem';
import { Logger } from './utils/logger';

export class DocumentationProvider {
    private openaiService: OpenAIService;
    private contextExtractor: ContextExtractor;
    private ragSystem: RAGSystem;
    private logger: Logger;

    // Documentation standards for different languages
    private defaultDocumentationStandards: { [key: string]: string } = {
        'javascript': 'Use JSDoc format. Include @param, @returns, and @throws tags.',
        'typescript': 'Use TypeScript-specific JSDoc. Include type information and detailed parameter descriptions.',
        'python': 'Follow PEP 257 docstring conventions. Use Google or NumPy docstring style.',
        'java': 'Use JavaDoc format. Include @param, @return, and @throws tags.',
        'csharp': 'Use XML documentation comments. Include <summary>, <param>, <returns>, and <exception> tags.',
        'default': 'Provide clear, concise documentation explaining the function\'s purpose, parameters, and return value.'
    };

    constructor(
        openaiService: OpenAIService, 
        contextExtractor: ContextExtractor,
        ragSystem: RAGSystem
    ) {
        this.openaiService = openaiService;
        this.contextExtractor = contextExtractor;
        this.ragSystem = ragSystem;
        this.logger = new Logger('DocumentationProvider');
    }

    /**
     * Generate documentation for a given function
     * @param functionInfo Function information
     * @returns Generated documentation string
     */
    public async generateDocumentation(functionInfo: FunctionInfo): Promise<string> {
        try {
            // Extract project context
            const projectContext = await this.ragSystem.extractProjectContext(functionInfo.language);

            // Get documentation standards for the language
            const documentationStandards = this.getDocumentationStandards(functionInfo.language);

            // Generate documentation
            const documentation = await this.openaiService.generateDocumentation(
                functionInfo.body,
                functionInfo.language,
                projectContext,
                documentationStandards
            );

            return this.formatDocumentation(documentation, functionInfo.language);
        } catch (error) {
            this.logger.error(`Documentation generation error: ${error}`);
            throw error;
        }
    }

    /**
     * Update existing documentation
     * @param functionInfo Function information
     * @param existingDocumentation Current documentation
     * @returns Updated documentation string
     */
    public async updateDocumentation(
        functionInfo: FunctionInfo, 
        existingDocumentation: string
    ): Promise<string> {
        try {
            // Extract project context
            const projectContext = await this.ragSystem.extractProjectContext(functionInfo.language);

            // Update documentation
            const updatedDocumentation = await this.openaiService.updateDocumentation(
                functionInfo.body,
                existingDocumentation,
                functionInfo.language,
                projectContext
            );

            return this.formatDocumentation(updatedDocumentation, functionInfo.language);
        } catch (error) {
            this.logger.error(`Documentation update error: ${error}`);
            throw error;
        }
    }

    /**
     * Get documentation standards for a specific language
     * @param language Programming language
     * @returns Documentation standards string
     */
    private getDocumentationStandards(language: string): string {
        // First, check for custom standards in VSCode settings
        const config = vscode.workspace.getConfiguration('gptDocAssistant');
        const customStandards = config.get<{ [key: string]: string }>('documentationStandards');

        // Check for language-specific custom standards
        if (customStandards && customStandards[language]) {
            return customStandards[language];
        }

        // Fall back to default standards
        return this.defaultDocumentationStandards[language] || 
               this.defaultDocumentationStandards['default'];
    }

    /**
     * Format documentation based on the programming language
     * @param documentation Generated documentation text
     * @param language Programming language
     * @returns Formatted documentation string
     */
    private formatDocumentation(documentation: string, language: string): string {
        switch (language) {
            case 'javascript':
            case 'typescript':
            case 'javascriptreact':
            case 'typescriptreact':
                // JSDoc style
                return this.formatJSDocDocumentation(documentation);
            
            case 'python':
                // Python docstring style
                return this.formatPythonDocstring(documentation);
            
            case 'java':
            case 'csharp':
                // JavaDoc style
                return this.formatJavaDocDocumentation(documentation);
            
            default:
                // Generic comment style
                return this.formatGenericDocumentation(documentation);
        }
    }

    /**
     * Format documentation in JSDoc style
     * @param documentation Documentation text
     * @returns JSDoc formatted documentation
     */
    private formatJSDocDocumentation(documentation: string): string {
        // Remove any existing JSDoc formatting
        const cleanedDoc = documentation.replace(/^\/\*\*|\*\/$/gm, '').trim();
        
        // Split into lines and add JSDoc formatting
        const lines = cleanedDoc.split('\n');
        const formattedLines = lines.map((line, index) => {
            if (index === 0) return `/** ${line}`;
            if (index === lines.length - 1) return ` * ${line} */`;
            return ` * ${line}`;
        });

        return formattedLines.join('\n');
    }

    /**
     * Format documentation in Python docstring style
     * @param documentation Documentation text
     * @returns Python docstring formatted documentation
     */
    private formatPythonDocstring(documentation: string): string {
        // Use triple quotes for docstring
        return `"""\n${documentation.trim()}\n"""`;
    }

    /**
     * Format documentation in JavaDoc style
     * @param documentation Documentation text
     * @returns JavaDoc formatted documentation
     */
    private formatJavaDocDocumentation(documentation: string): string {
        // Remove any existing JavaDoc formatting
        const cleanedDoc = documentation.replace(/^\/\*\*|\*\/$/gm, '').trim();
        
        // Split into lines and add JavaDoc formatting
        const lines = cleanedDoc.split('\n');
        const formattedLines = lines.map((line, index) => {
            if (index === 0) return `/** ${line}`;
            if (index === lines.length - 1) return ` * ${line} */`;
            return ` * ${line}`;
        });

        return formattedLines.join('\n');
    }

    /**
     * Format documentation in generic comment style
     * @param documentation Documentation text
     * @returns Generic comment formatted documentation
     */
    private formatGenericDocumentation(documentation: string): string {
        // Generic single-line comment style
        return documentation.split('\n')
            .map(line => `// ${line}`)
            .join('\n');
    }
}

// Define FunctionInfo interface for type safety
interface FunctionInfo {
    name: string;
    signature: string;
    body: string;
    startLine: number;
    endLine: number;
    language: string;
    existingDocumentation?: string | null;
}