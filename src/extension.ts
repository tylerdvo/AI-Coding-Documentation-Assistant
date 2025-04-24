// src/extension.ts
import * as vscode from 'vscode';
import { OpenAIService } from './openaiService';
import { CodeParser } from './codeParser';
import { Logger } from './utils/logger';

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

    // Register command to generate documentation
    let generateDocCommand = vscode.commands.registerTextEditorCommand(
        'gptDocAssistant.generateDoc', 
        async (textEditor, edit) => {
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
                        functionInfo.language
                    );

                    // Create a workspace edit to insert documentation
                    const insertPosition = new vscode.Position(functionInfo.startLine, 0);
                    const documentationEdit = new vscode.WorkspaceEdit();
                    documentationEdit.insert(
                        textEditor.document.uri, 
                        insertPosition, 
                        documentation + '\n'
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

    // Register command to update existing documentation
    let updateDocCommand = vscode.commands.registerTextEditorCommand(
        'gptDocAssistant.updateDoc',
        async (textEditor, edit) => {
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
                        updatedDocumentation + '\n'
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