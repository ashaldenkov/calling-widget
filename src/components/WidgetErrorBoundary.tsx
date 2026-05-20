import { Component, type ComponentChildren } from 'preact';

import { ERR_RENDER, getErrorMessage } from '../errors';
import { eventBus, WidgetEvent } from '../eventBus';
import ErrorScreen from '../screens/ErrorScreen';
import { resetToIdle } from '../stores/widgetStore';

interface State {
  error: Error | null;
}

interface Props {
  children: ComponentChildren;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('[CallWidget] Render error:', error);
    const message = getErrorMessage(error, ERR_RENDER);
    eventBus.emit(WidgetEvent.Error, { message });
  }

  private handleClose = (): void => {
    resetToIdle();
    eventBus.emit(WidgetEvent.WidgetDismissed);
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div class='cw-paper'>
        <ErrorScreen onClose={this.handleClose} />
      </div>
    );
  }
}
