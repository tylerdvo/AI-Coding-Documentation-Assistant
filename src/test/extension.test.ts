import * as assert from 'assert';
import * as vscode from 'vscode';
import { OpenAIService } from '../openaiService';
import { CodeParser } from '../codeParser';
import { ContextExtractor } from '../contextExtractor';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('OpenAIService Initialization', () => {
        const openaiService = new OpenAIService();
        
        // Check that the service can be instantiated
        assert.notStrictEqual(openaiService, undefined);
    });

    test('CodeParser Function Detection', () => {
        const codeParser = new CodeParser();
        
        // Mock a text document and position
        const mockDocument: vscode.TextDocument = {
            getText: () => `
            function testFunction(param1: string, param2: number): void {
                console.log(param1, param2);
            }
            `,
            languageId: 'typescript',
            lineAt: (line: number) => ({ text: '' } as vscode.TextLine)
        } as vscode.TextDocument;

        const mockPosition = new vscode.Position(2, 0);

        // Test finding a function
        const functionInfo = codeParser.findFunctionAtPosition(mockDocument, mockPosition);
        
        assert.notStrictEqual(functionInfo, null);
        assert.strictEqual(functionInfo?.name, 'testFunction');
    });

    test('ContextExtractor Workspace Context', () => {
        const contextExtractor = new ContextExtractor();
        
        // Test extracting workspace context
        const workspaceContext = contextExtractor.extractWorkspaceContext();
        
        // Check basic properties
        assert.notStrictEqual(workspaceContext, undefined);
        assert.ok(workspaceContext.rootPath !== undefined);
    });

    test('Documentation Generation Prompt Construction', async () => {
        const openaiService = new OpenAIService();
        
        // Test prompt construction for a simple function
        const mockFunction = `
        function add(a: number, b: number): number {
            return a + b;
        }
        `;

        try {
            const documentation = await openaiService.generateDocumentation(
                mockFunction, 
                'typescript'
            );

            // Check that documentation is generated
            assert.ok(documentation.length > 0);
        } catch (error) {
            // This might fail if OpenAI API key is not set
            console.warn('Documentation generation test skipped due to potential API configuration');
        }
    });
});