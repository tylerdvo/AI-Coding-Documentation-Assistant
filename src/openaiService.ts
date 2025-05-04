import * as dotenv from 'dotenv'; // New import
import { OpenAI } from 'openai';
import * as vscode from 'vscode';
import { Logger } from './utils/logger';

// Load environment variables - New line
dotenv.config();

export class OpenAIService {
    private openai: OpenAI | null = null;
    private logger: Logger;

    constructor() {
        this.logger = new Logger('OpenAIService');
    }

    /**
     * Initialize the OpenAI client with the API key
     * @param apiKey OpenAI API key
     * @returns Boolean indicating whether initialization was successful
     */
    public initialize(apiKey?: string): boolean { // Changed to optional parameter
        try {
            // Try to use provided key or environment variable
            const key = apiKey || process.env.OPENAI_API_KEY;
            
            // Added check for key existence
            if (!key) {
                this.logger.error('No API key provided');
                return false;
            }

            this.openai = new OpenAI({
                apiKey: key
            });
            this.logger.info('OpenAI client initialized');
            return true;
        } catch (error) {
            this.logger.error(`Failed to initialize OpenAI client: ${error}`);
            return false;
        }
    }

    /**
     * Generate documentation for the given code using the GPT model
     * @param code The code to document
     * @param language The programming language
     * @param context Additional context about the codebase
     * @param documentationStandards Documentation standards to follow
     * @returns Generated documentation string
     */
    public async generateDocumentation(
        code: string, 
        language: string, 
        context: string = '', 
        documentationStandards: string = ''
    ): Promise<string> {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized');
        }

        try {
            // Construct the prompt
            let prompt = this.constructPrompt(code, language, context, documentationStandards);
            
            // Call the OpenAI API
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4', // Use the appropriate model
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional developer assistant specialized in writing high-quality code documentation. Create clear, concise, and informative documentation that follows the specified standards and best practices.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7, // Balance between creativity and determinism
                max_tokens: 1000, // Limit response size
            });

            // Extract and return the generated documentation
            if (response.choices && response.choices.length > 0 && response.choices[0].message) {
                return response.choices[0].message.content || '';
            } else {
                throw new Error('No response from OpenAI API');
            }
        } catch (error) {
            this.logger.error(`Error calling OpenAI API: ${error}`);
            throw new Error(`Failed to generate documentation: ${error}`);
        }
    }

    /**
     * Update existing documentation based on code changes
     * @param code The updated code
     * @param existingDocumentation Existing documentation
     * @param language The programming language
     * @param context Additional context about the codebase
     * @returns Updated documentation string
     */
    public async updateDocumentation(
        code: string, 
        existingDocumentation: string, 
        language: string, 
        context: string = ''
    ): Promise<string> {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized');
        }

        try {
            // Construct the prompt for updating documentation
            const prompt = `
            I have the following ${language} code:
            \`\`\`${language}
            ${code}
            \`\`\`

            The current documentation is:
            \`\`\`
            ${existingDocumentation}
            \`\`\`

            ${context ? `Additional context about the codebase:\n${context}\n` : ''}

            Please update the documentation to accurately reflect the current code while maintaining the same style and format. Only make changes if necessary based on code modifications.
            `;

            // Call the OpenAI API
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4', // Use the appropriate model
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional developer assistant specialized in updating code documentation. Update the existing documentation to reflect code changes while maintaining the original style and format.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.5, // Lower temperature for more deterministic output when updating
                max_tokens: 1000, // Limit response size
            });

            // Extract and return the updated documentation
            if (response.choices && response.choices.length > 0 && response.choices[0].message) {
                return response.choices[0].message.content || '';
            } else {
                throw new Error('No response from OpenAI API');
            }
        } catch (error) {
            this.logger.error(`Error calling OpenAI API for update: ${error}`);
            throw new Error(`Failed to update documentation: ${error}`);
        }
    }

    /**
     * Construct a prompt for the GPT model based on the code and context
     * @param code The code to document
     * @param language The programming language
     * @param context Additional context about the codebase
     * @param documentationStandards Documentation standards to follow
     * @returns Constructed prompt string
     */
    private constructPrompt(
        code: string,
        language: string,
        context: string,
        documentationStandards: string
    ): string {
        return `
        I need documentation for the following ${language} code:
        \`\`\`${language}
        ${code}
        \`\`\`

        ${context ? `Additional context about the codebase:\n${context}\n` : ''}

        ${documentationStandards ? `Please follow these documentation standards:\n${documentationStandards}\n` : ''}

        Generate comprehensive documentation that explains:
        1. What the code does (purpose and functionality)
        2. Parameters and their types (if applicable)
        3. Return values and their types (if applicable)
        4. Any exceptions or errors that might be thrown
        5. Example usage (if helpful)

        The documentation should be in the appropriate format for ${language} (e.g., JSDoc for JavaScript/TypeScript, docstrings for Python, etc.).
        Be concise but thorough, and make sure the documentation is helpful for other developers.
        Return only the documentation, without any additional text or explanation.
        `;
    }

    /**
     * Check if the OpenAI service is properly initialized
     * @returns Boolean indicating whether the service is initialized
     */
    public isInitialized(): boolean {
        return this.openai !== null;
    }
}