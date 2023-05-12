"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "layout" is now active!');

	let disposable = vscode.commands.registerCommand('layout.startup', function () {
		// vscode.window.showInformationMessage('Layout startup!');

		const panel = vscode.window.createWebviewPanel(
			'layout',
			'Layout',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'src')]
			}
		);

		let indexHTML = fs.readFileSync(path.join(__dirname, 'src', 'index.html'), 'utf-8');
		indexHTML = indexHTML.replaceAll(/\{\{ (.*) \}\}/g, (match, match_path) => {
			const resourcePath = vscode.Uri.joinPath(context.extensionUri, 'src', ...match_path.split('/'));
			return panel.webview.asWebviewUri(resourcePath);
		});
		panel.webview.html = indexHTML;
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
