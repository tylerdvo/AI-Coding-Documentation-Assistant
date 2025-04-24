import * as vscode from 'vscode';
import * as path from 'path';

// Define interfaces for type safety
interface WorkspaceContext {
    rootPath: string;
    projectName: string;
    fileTypes: string[];
    projectStructure: ProjectStructureItem[];
}

interface ProjectStructureItem {
    name: string;
    type: 'file' | 'directory';
    children: string[];
}

export class ContextExtractor {
    /**
     * Extract context from the current workspace
     * @returns Context information object
     */
    public extractWorkspaceContext(): WorkspaceContext {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                rootPath: '',
                projectName: '',
                fileTypes: [],
                projectStructure: []
            };
        }

        const rootFolder = workspaceFolders[0];
        
        return {
            rootPath: rootFolder.uri.fsPath,
            projectName: path.basename(rootFolder.uri.fsPath),
            fileTypes: this.getProjectFileTypes(rootFolder),
            projectStructure: this.mapProjectStructure(rootFolder)
        };
    }

    /**
     * Get unique file types in the project
     * @param rootFolder Root workspace folder
     * @returns Array of unique file extensions
     */
    private getProjectFileTypes(rootFolder: vscode.WorkspaceFolder): string[] {
        const fileTypes = new Set<string>();

        try {
            // Use VS Code's file system API to find files
            vscode.workspace.findFiles(
                new vscode.RelativePattern(rootFolder, '**/*'),
                '**/node_modules/**'
            ).then(files => {
                files.forEach(file => {
                    const ext = path.extname(file.fsPath);
                    if (ext) fileTypes.add(ext);
                });
            });
        } catch (error) {
            console.error('Error extracting file types:', error);
        }

        return Array.from(fileTypes);
    }

    /**
     * Map basic project structure
     * @param rootFolder Root workspace folder
     * @returns Array of top-level directories and their contents
     */
    private mapProjectStructure(rootFolder: vscode.WorkspaceFolder): ProjectStructureItem[] {
        const structure: ProjectStructureItem[] = [];

        try {
            const rootPath = rootFolder.uri.fsPath;
            const entries = this.readDirectorySync(rootPath);

            entries.forEach(entry => {
                const fullPath = path.join(rootPath, entry);
                const stats = this.getFileStats(fullPath);

                structure.push({
                    name: entry,
                    type: stats.isDirectory ? 'directory' : 'file',
                    children: stats.isDirectory 
                        ? this.readDirectorySync(fullPath).slice(0, 5) // Limit to first 5 children
                        : []
                });
            });
        } catch (error) {
            console.error('Error mapping project structure:', error);
        }

        return structure;
    }

    /**
     * Synchronously read directory contents
     * @param dirPath Directory path
     * @returns Array of directory entries
     */
    private readDirectorySync(dirPath: string): string[] {
        try {
            return require('fs').readdirSync(dirPath, { withFileTypes: false })
                .filter((entry: string) => !entry.startsWith('.') && entry !== 'node_modules');
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
            return [];
        }
    }

    /**
     * Get file/directory stats
     * @param path File or directory path
     * @returns Stat information
     */
    private getFileStats(path: string): { isDirectory: boolean } {
        try {
            const stats = require('fs').statSync(path);
            return {
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            console.error(`Error getting stats for ${path}:`, error);
            return { isDirectory: false };
        }
    }

    /**
     * Generate a brief project description
     * @returns Project description string
     */
    public generateProjectDescription(): string {
        const context = this.extractWorkspaceContext();
        
        return `Project: ${context.projectName}
Root Path: ${context.rootPath}
File Types: ${context.fileTypes.join(', ')}
Top-level Directories: ${context.projectStructure
    .filter(item => item.type === 'directory')
    .map(item => item.name)
    .join(', ')}`;
    }
}