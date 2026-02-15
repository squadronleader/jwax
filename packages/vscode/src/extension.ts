import * as vscode from 'vscode';
import {
  parseJsonText,
  createLoadedOrchestrator,
  formatResultsAsTable,
  formatTableList,
  formatSchema,
  isJsonText,
} from './helpers';
import { QueryHistoryManager } from './query-history';
import { parseSQLError } from './error-parser';

let outputChannel: vscode.OutputChannel;
let historyManager: QueryHistoryManager;

function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('JWAX');
  }
  return outputChannel;
}

/**
 * Reads the queryHistorySize setting and returns it.
 */
function getHistorySize(): number {
  const config = vscode.workspace.getConfiguration('jwax');
  return config.get<number>('queryHistorySize', 5);
}

/**
 * Get the active tab's text editor from the active tab group.
 * This works even when focus is not on the editor (e.g., when terminal has focus).
 */
function getActiveTabEditor(): vscode.TextEditor | undefined {

  const activeTabGroup = vscode.window.tabGroups.activeTabGroup;
  if (!activeTabGroup || !activeTabGroup.activeTab) {
    return undefined;
  }

  const activeTab = activeTabGroup.activeTab;
  if (activeTab.input instanceof vscode.TabInputText) {
    const uri = activeTab.input.uri;
    // Find the editor for this URI from the active group
    return activeTabGroup.tabs
      .filter((tab) => tab.input instanceof vscode.TabInputText)
      .map((tab) => {
        const textInput = tab.input as vscode.TabInputText;
        // Check if this tab's document is open in an editor
        const editors = vscode.window.visibleTextEditors.filter(
          (editor) => editor.document.uri.toString() === textInput.uri.toString()
        );
        return editors[0];
      })
      .find((editor) => editor !== undefined);
  }

  return undefined;
}

/**
 * Reads JSON text from the active editor, validates it's a JSON file.
 * Falls back to the active tab when the editor doesn't have focus.
 */
function getActiveJsonText(): string {
  const editor = getActiveTabEditor();
  if (!editor) {
    throw new Error('No active editor. Please open a JSON file first.');
  }

  const document = editor.document;

  if (!checkDocumentIsJson(document)) {
    throw new Error('The active file is not a JSON file. Please open a JSON file first.');
  }

  return document.getText();
}

export function checkDocumentIsJson(TextDocument: vscode.TextDocument): boolean {
  if(TextDocument.languageId === 'json' || TextDocument.languageId === 'jsonc') {
    return true;
  }
  
  if (isJsonText(TextDocument.getText())) {
    return true;
  }

  return false;
}

/**
 * Get the file URI from the active editor or active tab.
 */
function getActiveFileUri(): string {
  const editor = getActiveTabEditor();
  if (!editor) {
    return '';
  }
  return editor.document.uri.toString();
}

/**
 * Show a Quick Pick with "Write new query" at the top and history below.
 * - Select "Write new query" to open an input box for a custom query
 * - Select a history item to execute it immediately
 */
async function getQueryFromUser(fileUri: string): Promise<string | undefined> {
  const history = historyManager.getHistory(fileUri);

  // Build items: "Write new query" always first, then history
  const items: (vscode.QuickPickItem & { isNewQuery?: boolean })[] = [
    {
      label: '$(edit) Write new query',
      description: 'Enter a new SQL query',
      detail: '',
      isNewQuery: true,
    },
  ];

  // Add history items below
  if (history.length > 0) {
    items.push({
      label: '$(dash) Recently used',
      kind: vscode.QuickPickItemKind.Separator,
    });

    history.forEach((query, index) => {
      items.push({
        label: `$(history) ${query.length > 60 ? query.substring(0, 57) + '...' : query}`,
        description: `${index === 0 ? '(most recent)' : ''}`,
        detail: query,
        isNewQuery: false,
      });
    });
  }

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a recent query or new query',
  });

  if (!selected) {
    return undefined;
  }

  // If "Write new query" was selected, show input box
  if (selected.isNewQuery) {
    return vscode.window.showInputBox({
      prompt: 'Enter SQL query',
      placeHolder: 'SELECT * FROM tablename',
    });
  }

  // Return the selected history query
  return selected.detail;
}

async function runQuery(): Promise<void> {
  const channel = getOutputChannel();
  const fileUri = getActiveFileUri();

  let text: string;
  try {
    text = getActiveJsonText();
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message);
    return;
  }

  let jsonData: unknown;
  try {
    jsonData = parseJsonText(text);
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message);
    return;
  }

  const sql = await getQueryFromUser(fileUri);

  if (!sql) {
    return;
  }

  const orchestrator = await createLoadedOrchestrator(jsonData);
  try {
    const results = orchestrator.executeQuery(sql);
    channel.clear();
    channel.appendLine(`> ${sql}`);
    channel.appendLine('');
    channel.appendLine(formatResultsAsTable(results));
    channel.appendLine(`\n${results.rows.length} row(s) returned.`);
    channel.show(true);

    // Add to history after successful execution
    historyManager.addQuery(fileUri, sql);
  } catch (err: any) {
    const errorInfo = parseSQLError(err);
    
    if (errorInfo.isTableNotFound) {
      vscode.window.showErrorMessage(
        `SQL Error: ${errorInfo.message}`,
        'View Tables'
      ).then((action) => {
        if (action === 'View Tables') {
          vscode.commands.executeCommand('jwax.showTables');
        }
      });
    } else {
      vscode.window.showErrorMessage(`SQL Error: ${err.message}`);
    }
  } finally {
    orchestrator.close();
  }
}

async function showTables(): Promise<void> {
  const channel = getOutputChannel();

  let text: string;
  try {
    text = getActiveJsonText();
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message);
    return;
  }

  let jsonData: unknown;
  try {
    jsonData = parseJsonText(text);
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message);
    return;
  }

  const orchestrator = await createLoadedOrchestrator(jsonData);
  try {
    const tables = orchestrator.listTables();
    channel.clear();
    channel.appendLine(formatTableList(tables));
    channel.show(true);
  } finally {
    orchestrator.close();
  }
}

async function showSchema(): Promise<void> {
  const channel = getOutputChannel();

  let text: string;
  try {
    text = getActiveJsonText();
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message);
    return;
  }

  let jsonData: unknown;
  try {
    jsonData = parseJsonText(text);
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message);
    return;
  }

  const orchestrator = await createLoadedOrchestrator(jsonData);
  try {
    const schema = orchestrator.getSchema();
    channel.clear();
    channel.appendLine(formatSchema(schema));
    channel.show(true);
  } finally {
    orchestrator.close();
  }
}

export function activate(context: vscode.ExtensionContext): void {
  // Initialize history manager with the configured size
  const historySize = getHistorySize();
  historyManager = new QueryHistoryManager(historySize);

  // Listen for configuration changes and update the history manager
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('jwax.queryHistorySize')) {
        const newSize = getHistorySize();
        historyManager.setMaxSize(newSize);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('jwax.runQuery', runQuery),
    vscode.commands.registerCommand('jwax.showTables', showTables),
    vscode.commands.registerCommand('jwax.showSchema', showSchema),
  );
}

export function deactivate(): void {
  if (outputChannel) {
    outputChannel.dispose();
  }
}
