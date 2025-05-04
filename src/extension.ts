// src/extension.ts
import * as vscode from 'vscode';
import * as dotenv from 'dotenv'; 
import { OpenAIService } from './openaiService';
import { CodeParser } from './codeParser';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Define FunctionInfo interface to match CodeParser
interface FunctionInfo {
    name: string;
    signature: string;
    body: string;
    startLine: number;
    endLine: number;
    language: string;
    existingDocumentation?: string | null;
}

export function activate(context: vscode.ExtensionContext) {
    // Create a logger instance
    const logger = new Logger('GPT Documentation Assistant');
    logger.info('Activating GPT Documentation Assistant extension');

    // Initialize services
    const openaiService = new OpenAIService();
    const codeParser = new CodeParser();

    // Helper function to clean up AI-generated documentation
    const cleanupDocumentation = (documentation: string): string => {
        return documentation
            .replace(/```.*\n|Sure, here is the updated documentation:\n/g, '')
            .replace(/^\/\*\*|\*\/$/gm, '')
            .trim();
    };

    // Helper function to format documentation based on language
    const formatDocumentation = (documentation: string, language: string): string => {
        const cleanedDoc = cleanupDocumentation(documentation);

        switch (language) {
            case 'typescript':
            case 'javascript':
            case 'javascriptreact':
            case 'typescriptreact':
                // JSDoc style
                const lines = cleanedDoc.split('\n').map(line => line.trim());
                return [
                    '/**',
                    ...lines.map(line => ` * ${line}`),
                    ' */',
                    ''
                ].join('\n');
            
            case 'python':
                // Python docstring
                return `"""\n${cleanedDoc}\n"""\n`;
            
            default:
                // Generic comment
                return cleanedDoc.split('\n')
                    .map(line => `// ${line}`)
                    .join('\n') + '\n';
        }
    };

    // Get API key from multiple sources
    const config = vscode.workspace.getConfiguration('gptDocAssistant');
    const configApiKey = config.get<string>('openaiApiKey');
    const envApiKey = process.env.OPENAI_API_KEY;

    // Log API key sources for debugging
    logger.info(`API Key from config: ${configApiKey ? 'Found' : 'Not Found'}`);
    logger.info(`API Key from env: ${envApiKey ? 'Found' : 'Not Found'}`);

    // Try to initialize with config key
    let initialized = false;
    if (configApiKey) {
        initialized = openaiService.initialize(configApiKey);
        logger.info(`Initialization with config key: ${initialized}`);
    }

    // If not initialized, try env key
    if (!initialized && envApiKey) {
        initialized = openaiService.initialize(envApiKey);
        logger.info(`Initialization with env key: ${initialized}`);
    }

    // If still not initialized, show error
    if (!initialized) {
        vscode.window.showErrorMessage(
            'OpenAI API key is not configured. Please set it in extension settings.'
        );
        return;
    }

    // Register command to generate documentation
    let generateDocCommand = vscode.commands.registerTextEditorCommand(
        'gptDocAssistant.generateDoc', 
        async (textEditor, edit) => {
            // Check if service is initialized before generating
            if (!openaiService.isInitialized()) {
                vscode.window.showErrorMessage('OpenAI service is not initialized.');
                return;
            }

            try {
                // Find the function at the current cursor position
                const functionInfo = codeParser.findFunctionAtPosition(
                    textEditor.document, 
                    textEditor.selection.active
                );

                if (!functionInfo) {
                    vscode.window.showInformationMessage('No function found at the current cursor position');
                    return;
                }

                // Show progress while generating documentation
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Generating Documentation',
                    cancellable: false
                }, async () => {
                    // Generate documentation
                    const documentation = await openaiService.generateDocumentation(
                        functionInfo.body,
                        functionInfo.language,
                        '', // project context (optional)
                        ''  // documentation standards (optional)
                    );

                    // Format documentation based on language
                    const formattedDocumentation = formatDocumentation(
                        documentation, 
                        functionInfo.language
                    );

                    // Create a workspace edit to insert documentation
                    const insertPosition = new vscode.Position(functionInfo.startLine, 0);
                    const documentationEdit = new vscode.WorkspaceEdit();
                    documentationEdit.insert(
                        textEditor.document.uri, 
                        insertPosition, 
                        formattedDocumentation
                    );

                    // Apply the edit
                    await vscode.workspace.applyEdit(documentationEdit);
                });

            } catch (error) {
                logger.error(`Documentation generation error: ${error}`);
                vscode.window.showErrorMessage(`Failed to generate documentation: ${error}`);
            }
        }
    );

    // Register command to update documentation
    let updateDocCommand = vscode.commands.registerTextEditorCommand(
        'gptDocAssistant.updateDoc',
        async (textEditor, edit) => {
            // Check if service is initialized before updating
            if (!openaiService.isInitialized()) {
                vscode.window.showErrorMessage('OpenAI service is not initialized.');
                return;
            }

            try {
                // Find the function at the current cursor position
                const functionInfo = codeParser.findFunctionAtPosition(
                    textEditor.document, 
                    textEditor.selection.active
                );

                // Check if function info exists and has existing documentation
                if (!functionInfo || !functionInfo.existingDocumentation) {
                    vscode.window.showInformationMessage('No existing documentation found');
                    return;
                }

                // Show progress while updating documentation
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Updating Documentation',
                    cancellable: false
                }, async () => {
                    // Safely unwrap existingDocumentation (we've already checked it exists)
                    const existingDoc = functionInfo.existingDocumentation!;

                    // Update documentation
                    const updatedDocumentation = await openaiService.updateDocumentation(
                        functionInfo.body,
                        existingDoc,
                        functionInfo.language,
                        '' // project context (optional)
                    );

                    // Format updated documentation
                    const formattedDocumentation = formatDocumentation(
                        updatedDocumentation, 
                        functionInfo.language
                    );

                    // Create a workspace edit to replace existing documentation
                    const documentationEdit = new vscode.WorkspaceEdit();
                    
                    // Find the range of existing documentation
                    const startLine = functionInfo.startLine - 1;
                    const endLine = functionInfo.startLine;
                    const range = new vscode.Range(
                        new vscode.Position(startLine, 0),
                        new vscode.Position(endLine, 0)
                    );

                    // Replace existing documentation
                    documentationEdit.replace(
                        textEditor.document.uri, 
                        range, 
                        formattedDocumentation
                    );

                    // Apply the edit
                    await vscode.workspace.applyEdit(documentationEdit);
                });

            } catch (error) {
                logger.error(`Documentation update error: ${error}`);
                vscode.window.showErrorMessage(`Failed to update documentation: ${error}`);
            }
        }
    );

    // Add commands to the context for disposal
    context.subscriptions.push(generateDocCommand, updateDocCommand);

    logger.info('GPT Documentation Assistant extension activated');
}

export function deactivate() {
    // Clean up logic if needed
    console.log('GPT Documentation Assistant extension deactivated');
}