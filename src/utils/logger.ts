import * as vscode from 'vscode';

export class Logger {
    private name: string;
    private outputChannel: vscode.OutputChannel;
    private static instance: vscode.OutputChannel;

    constructor(name: string) {
        this.name = name;
        
        // Use a singleton pattern for the output channel
        if (!Logger.instance) {
            Logger.instance = vscode.window.createOutputChannel('GPT Documentation Assistant');
        }
        
        this.outputChannel = Logger.instance;
    }

    /**
     * Log an informational message
     * @param message The message to log
     */
    public info(message: string): void {
        this.log('INFO', message);
    }

    /**
     * Log an error message
     * @param message The error message to log
     */
    public error(message: string): void {
        this.log('ERROR', message);
    }

    /**
     * Log a warning message
     * @param message The warning message to log
     */
    public warning(message: string): void {
        this.log('WARNING', message);
    }

    /**
     * Write a log entry with the specified level
     * @param level The log level
     * @param message The message to log
     */
    private log(level: string, message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] [${level}] [${this.name}] ${message}`);
    }

    /**
     * Show the output channel
     */
    public show(): void {
        this.outputChannel.show();
    }
}