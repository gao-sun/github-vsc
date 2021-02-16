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
  readonly changedGroup: SourceControlResourceGroup;
  readonly scm: SourceControl;

  // MARK: disposable
  private readonly disposable: Disposable;

  constructor(rootUri: Uri) {
    this.scm = scm.createSourceControl('ghfs-scm', 'GitHub VSC', rootUri);
    this.scm.quickDiffProvider = this;
    this.scm.inputBox.visible = false;
    this.scm.inputBox.placeholder = 'Commit message (press Cmd/Ctrl+Enter to submit)';
    this.changedGroup = this.scm.createResourceGroup('changes', 'Changed Files');
    this.disposable = Disposable.from(this.scm);
  }

  dispose(): void {
    this.disposable?.dispose();
  }

  // MARK: private funcs
  private updateInputBoxVisibility() {
    this.scm.inputBox.visible = this.changedGroup.resourceStates.length > 0;
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
    this.updateInputBoxVisibility();
  }

  removeChangedFile(uri: Uri): void {
    this.changedGroup.resourceStates = this.changedGroup.resourceStates.filter(
      ({ resourceUri }) => resourceUri.toString() !== uri.toString(),
    );
    this.updateInputBoxVisibility();
  }

  getChangedFiles(): Uri[] {
    return this.changedGroup.resourceStates.map(({ resourceUri }) => resourceUri);
  }

  // MARK: QuickDiffProvider implementation
  provideOriginalResource?(uri: Uri, token: CancellationToken): Uri {
    return uri.with({ query: `${LOOKUP_ORIGINAL_KEY}=true` });
  }
}
