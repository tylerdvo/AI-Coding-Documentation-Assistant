import * as vscode from 'vscode';
import { Logger } from './logger';

export class SettingsManager {
    private context: vscode.ExtensionContext;
    private logger: Logger;

    // Configuration keys
    private static readonly CONFIG_SECTION = 'gptDocAssistant';
    private static readonly API_KEY_CONFIG = 'openaiApiKey';
    private static readonly DOC_STANDARDS_CONFIG = 'documentationStandards';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.logger = new Logger('SettingsManager');
    }

    /**
     * Retrieve the OpenAI API key from configuration
     * @returns OpenAI API key or undefined if not set
     */
    public getOpenAIApiKey(): string | undefined {
        const config = vscode.workspace.getConfiguration(SettingsManager.CONFIG_SECTION);
        const apiKey = config.get<string>(SettingsManager.API_KEY_CONFIG);

        if (!apiKey) {
            this.logger.warning('OpenAI API key is not configured');
            return undefined;
        }

        return apiKey;
    }

    /**
     * Update OpenAI API key in the configuration
     * @param apiKey New API key
     * @returns Promise that resolves when the update is complete
     */
    public async updateOpenAIApiKey(apiKey: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(SettingsManager.CONFIG_SECTION);
        
        try {
            await config.update(
                SettingsManager.API_KEY_CONFIG, 
                apiKey, 
                vscode.ConfigurationTarget.Global
            );
            this.logger.info('OpenAI API key updated successfully');
        } catch (error) {
            this.logger.error(`Failed to update API key: ${error}`);
            throw error;
        }
    }

    /**
     * Get documentation standards for a specific language
     * @param language Programming language
     * @returns Documentation standards or undefined
     */
    public getDocumentationStandards(language: string): string | undefined {
        const config = vscode.workspace.getConfiguration(SettingsManager.CONFIG_SECTION);
        const documentationStandards = config.get<{ [key: string]: string }>(
            SettingsManager.DOC_STANDARDS_CONFIG
        );

        return documentationStandards?.[language];
    }

    /**
     * Update documentation standards for a specific language
     * @param language Programming language
     * @param standards Documentation standards
     * @returns Promise that resolves when the update is complete
     */
    public async updateDocumentationStandards(
        language: string, 
        standards: string
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration(SettingsManager.CONFIG_SECTION);
        
        try {
            // Get current documentation standards
            const currentStandards = config.get<{ [key: string]: string }>(
                SettingsManager.DOC_STANDARDS_CONFIG
            ) || {};

            // Update standards for the specific language
            currentStandards[language] = standards;

            // Save updated standards
            await config.update(
                SettingsManager.DOC_STANDARDS_CONFIG, 
                currentStandards, 
                vscode.ConfigurationTarget.Global
            );

            this.logger.info(`Documentation standards updated for ${language}`);
        } catch (error) {
            this.logger.error(`Failed to update documentation standards: ${error}`);
            throw error;
        }
    }

    /**
     * Reset documentation standards to default
     * @param language Optional language to reset (resets all if not specified)
     * @returns Promise that resolves when reset is complete
     */
    public async resetDocumentationStandards(language?: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(SettingsManager.CONFIG_SECTION);
        
        try {
            if (language) {
                // Get current standards
                const currentStandards = config.get<{ [key: string]: string }>(
                    SettingsManager.DOC_STANDARDS_CONFIG
                ) || {};

                // Remove standards for specific language
                delete currentStandards[language];

                // Update configuration
                await config.update(
                    SettingsManager.DOC_STANDARDS_CONFIG, 
                    currentStandards, 
                    vscode.ConfigurationTarget.Global
                );
            } else {
                // Remove all custom documentation standards
                await config.update(
                    SettingsManager.DOC_STANDARDS_CONFIG, 
                    {}, 
                    vscode.ConfigurationTarget.Global
                );
            }

            this.logger.info(`Documentation standards reset${language ? ` for ${language}` : ''}`);
        } catch (error) {
            this.logger.error(`Failed to reset documentation standards: ${error}`);
            throw error;
        }
    }

    /**
     * Check if required settings are configured
     * @returns Boolean indicating if extension is ready to use
     */
    public isConfigured(): boolean {
        return !!this.getOpenAIApiKey();
    }
}