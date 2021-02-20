import {
  CancellationToken,
  Disposable,
  QuickDiffProvider,
  scm,
  SourceControl,
  SourceControlResourceGroup,
  Uri,
} from 'vscode';
import { LOOKUP_ORIGINAL_KEY } from './lookup';

export class GHFSSourceControl implements QuickDiffProvider, Disposable {
  static commitChangesCommand = 'github-vsc.commitChanges';
  readonly changedGroup: SourceControlResourceGroup;
  readonly scm: SourceControl;

  // MARK: disposable
  private readonly disposable: Disposable;

  constructor(rootUri: Uri) {
    this.scm = scm.createSourceControl('ghfs-scm', 'GitHub VSC', rootUri);
    this.scm.quickDiffProvider = this;
    this.scm.inputBox.visible = false;
    this.scm.inputBox.placeholder = 'Commit message (press Cmd/Ctrl+Enter to submit)';
    this.scm.acceptInputCommand = {
      title: 'Commit Changes',
      command: GHFSSourceControl.commitChangesCommand,
    };
    this.changedGroup = this.scm.createResourceGroup('changes', 'Changed Files');
    this.disposable = Disposable.from(this.scm);
  }

  dispose(): void {
    this.disposable?.dispose();
  }

  // MARK: private funcs
  private updateState() {
    const hasChangedFile = this.changedGroup.resourceStates.length > 0;
    this.scm.inputBox.visible = hasChangedFile;
  }

  // MARK: class funcs
  addChangedFile(uri: Uri): void {
    if (
      !this.changedGroup.resourceStates.find(
        ({ resourceUri }) => resourceUri.toString() === uri.toString(),
      )
    ) {
      this.changedGroup.resourceStates = this.changedGroup.resourceStates.concat({
        resourceUri: uri,
        command: { title: 'Open', command: 'vscode.open', arguments: [uri] },
      });
    }
    this.updateState();
  }

  removeChangedFile(uri: Uri): void {
    this.changedGroup.resourceStates = this.changedGroup.resourceStates.filter(
      ({ resourceUri }) => resourceUri.toString() !== uri.toString(),
    );
    this.updateState();
  }

  removeAllChangedFiles(): void {
    this.changedGroup.resourceStates = [];
    this.updateState();
  }

  getChangedFiles(): Uri[] {
    return this.changedGroup.resourceStates.map(({ resourceUri }) => resourceUri);
  }

  // MARK: QuickDiffProvider implementation
  provideOriginalResource?(uri: Uri, token: CancellationToken): Uri {
    return uri.with({ query: `${LOOKUP_ORIGINAL_KEY}=true` });
  }
}
