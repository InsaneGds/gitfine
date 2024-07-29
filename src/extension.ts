// Imports
import * as vscode from 'vscode';
import axios from 'axios';

const GITHUB_TOKEN_KEY = 'gitFine.token';

// Activation functions
export function activate(context: vscode.ExtensionContext) {
    console.log('GitFine is now active!');

    let disposable = vscode.commands.registerCommand('extension.showGitFine', async () => {
        let token = getToken();

        if (!token) {
            token = await promptForToken();
            if (!token) {
                vscode.window.showErrorMessage('GitHub token is required to fetch repository stats.');
                return;
            }
            saveToken(token);
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const folderPath = workspaceFolders[0].uri.fsPath;
            let packageJson;
            try {
                packageJson = require(`${folderPath}/package.json`);
            } catch (error) {
                vscode.window.showErrorMessage('Failed to read package.json from the workspace.');
                return;
            }
            
            const repoUrl = packageJson.repository?.url;
            if (repoUrl) {
                const repoDetails = getRepoDetails(repoUrl);
                if (!repoDetails) {
                    vscode.window.showErrorMessage('Invalid GitHub repository URL in package.json.');
                    return;
                }

                try {
                    const stats = await fetchGitHubStats(repoDetails.owner, repoDetails.repo, token);
                    vscode.window.showInformationMessage(`Stars: ${stats.stargazers_count}, Forks: ${stats.forks_count}, Open Issues: ${stats.open_issues_count}`);
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to fetch GitHub stats.');
                }
            } else {
                vscode.window.showErrorMessage('No repository URL found in package.json.');
            }
        } else {
            vscode.window.showErrorMessage('No workspace folder found.');
        }
    });

    context.subscriptions.push(disposable);
}

function getToken(): string | undefined {
    return vscode.workspace.getConfiguration().get<string>(GITHUB_TOKEN_KEY);
}


// Fetch data
async function promptForToken(): Promise<string | undefined> {
    const token = await vscode.window.showInputBox({
        prompt: 'Enter your GitHub Personal Access Token',
        ignoreFocusOut: true,
        password: true,
    });
    return token;
}

function saveToken(token: string) {
    vscode.workspace.getConfiguration().update(GITHUB_TOKEN_KEY, token, vscode.ConfigurationTarget.Global);
}

function getRepoDetails(repoUrl: string): { owner: string, repo: string } | null {
    const match = repoUrl.match(/github\.com\/(.+?)\/(.+?)(\.git)?$/);
    if (match) {
        return { owner: match[1], repo: match[2] };
    } else {
        return null;
    }
}

async function fetchGitHubStats(owner: string, repo: string, token: string): Promise<any> {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const headers = { 'Authorization': `token ${token}` };

    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        throw new Error('Failed to fetch GitHub stats.');
    }
}

/* De-activation

You can add // right before the following line to remove the de-activation function*/
export function deactivate() {}