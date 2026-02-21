import * as vscode from 'vscode';
import { join, relative } from 'path';
import { readdirSync } from 'fs';
import { parseIgnoreRules, applyIgnoreRules } from '../../services/codebase/ignore-rules';

// ============================================================================
// Config Persistence (via VS Code Settings API)
// ============================================================================

const ALWAYS_EXCLUDE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.devtools', '.vscode',
]);

function getHostWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;
  return folders[0].uri.fsPath;
}

function readSelectedWorkspace(): string | undefined {
  const config = vscode.workspace.getConfiguration('devtools');
  const value = config.get<string>('lmToolsWorkspace', '.');
  return value || undefined;
}

function writeSelectedWorkspace(relativePath: string): void {
  const config = vscode.workspace.getConfiguration('devtools');
  config.update('lmToolsWorkspace', relativePath, vscode.ConfigurationTarget.Workspace);
}

// ============================================================================
// Workspace Item
// ============================================================================

interface WorkspaceItem {
  uri: vscode.Uri;
  name: string;
  relativePath: string;
}

// ============================================================================
// Folder Discovery Helpers
// ============================================================================

type IgnoreRules = ReturnType<typeof parseIgnoreRules>;

function getVisibleSubfolders(dir: string, root: string, ignoreRules: IgnoreRules): WorkspaceItem[] {
  const items: WorkspaceItem[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (ALWAYS_EXCLUDE_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;

      const fullPath = join(dir, entry.name);
      const relPath = relative(root, fullPath).replace(/\\/g, '/');
      if (ignoreRules.length > 0 && applyIgnoreRules(`${relPath}/`, ignoreRules)) continue;

      items.push({
        uri: vscode.Uri.file(fullPath),
        name: entry.name,
        relativePath: relPath,
      });
    }
  } catch {
    // Directory unreadable
  }

  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

function hasVisibleSubfolders(dir: string, root: string, ignoreRules: IgnoreRules): boolean {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (ALWAYS_EXCLUDE_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;

      const fullPath = join(dir, entry.name);
      const relPath = relative(root, fullPath).replace(/\\/g, '/');
      if (ignoreRules.length > 0 && applyIgnoreRules(`${relPath}/`, ignoreRules)) continue;

      return true;
    }
  } catch {
    // Directory unreadable
  }
  return false;
}

// ============================================================================
// Project Tree Provider — Workspace Root Picker
// ============================================================================

export class ProjectTreeProvider implements vscode.TreeDataProvider<WorkspaceItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<WorkspaceItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly _onDidSelectWorkspace = new vscode.EventEmitter<string>();
  readonly onDidSelectWorkspace = this._onDidSelectWorkspace.event;

  private readonly disposables: vscode.Disposable[] = [];
  private selectedPath: string | undefined;
  private ignoreRules: IgnoreRules = [];
  private root: string | undefined;

  constructor() {
    this.selectedPath = readSelectedWorkspace();
    this.root = getHostWorkspaceRoot();
    if (this.root) {
      this.ignoreRules = parseIgnoreRules(this.root);
    }

    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.workspace.workspaceFolders?.[0]?.uri ?? vscode.Uri.file('.'),
        '*'
      ),
      false, true, false,
    );
    this.disposables.push(watcher);
    watcher.onDidCreate(() => this.refresh());
    watcher.onDidDelete(() => this.refresh());

    console.log('[devtools] ProjectTreeProvider initialized — workspace root picker');
  }

  refresh(): void {
    if (this.root) {
      this.ignoreRules = parseIgnoreRules(this.root);
    }
    this._onDidChangeTreeData.fire(undefined);
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }

  selectWorkspace(item: WorkspaceItem): void {
    this.selectedPath = item.relativePath;
    writeSelectedWorkspace(item.relativePath);
    this._onDidSelectWorkspace.fire(item.relativePath);
    this.refresh();
    vscode.window.showInformationMessage(`Workspace root set to: ${item.name}`);
  }

  getSelectedWorkspace(): string | undefined {
    return this.selectedPath;
  }

  getTreeItem(element: WorkspaceItem): vscode.TreeItem {
    const isSelected = element.relativePath === this.selectedPath;
    const expandable = this.root
      ? hasVisibleSubfolders(element.uri.fsPath, this.root, this.ignoreRules)
      : false;

    const collapsibleState = expandable
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;

    const item = new vscode.TreeItem(element.name, collapsibleState);
    item.iconPath = new vscode.ThemeIcon(isSelected ? 'folder-active' : 'folder');
    item.tooltip = element.uri.fsPath;
    item.contextValue = isSelected ? 'workspaceActive' : 'workspaceInactive';

    item.command = {
      command: 'devtools.selectWorkspace',
      title: 'Select as Workspace Root',
      arguments: [element],
    };

    return item;
  }

  getChildren(element?: WorkspaceItem): WorkspaceItem[] {
    if (!this.root) return [];

    if (!element) {
      const rootName = this.root.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? this.root;
      return [{
        uri: vscode.Uri.file(this.root),
        name: rootName,
        relativePath: '.',
      }];
    }

    return getVisibleSubfolders(element.uri.fsPath, this.root, this.ignoreRules);
  }
}

// ============================================================================
// Singleton accessor
// ============================================================================

let projectTreeProvider: ProjectTreeProvider | undefined;

export function setProjectTreeProvider(provider: ProjectTreeProvider): void {
  projectTreeProvider = provider;
}

export function getProjectTreeProvider(): ProjectTreeProvider | undefined {
  return projectTreeProvider;
}
