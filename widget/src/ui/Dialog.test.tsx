import { fireEvent, render } from '@testing-library/preact';

import { Dialog, DialogActions, DialogContent, DialogTitle } from './Dialog';

describe('Dialog', () => {
  it('calls onClose when Escape is pressed while open', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose}>
        content
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose for non-Escape keys', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose}>
        content
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not attach a keydown listener when closed', () => {
    const onClose = vi.fn();
    render(
      <Dialog open={false} onClose={onClose}>
        content
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog open onClose={onClose}>
        content
      </Dialog>,
    );
    fireEvent.click(container.querySelector('.cw-dialog__backdrop')!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not throw on Escape when onClose is omitted', () => {
    render(<Dialog open>content</Dialog>);
    expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
  });

  it('reflects open state via data-open and inert', () => {
    const { container, rerender } = render(<Dialog open>content</Dialog>);
    const dialog = container.querySelector('.cw-dialog');
    expect(dialog).toHaveAttribute('data-open', '');

    rerender(<Dialog open={false}>content</Dialog>);
    expect(container.querySelector('.cw-dialog')).not.toHaveAttribute(
      'data-open',
    );
  });

  it('renders header and children', () => {
    const { getByText } = render(
      <Dialog open header={<span>My Header</span>}>
        My Body
      </Dialog>,
    );
    expect(getByText('My Header')).toBeInTheDocument();
    expect(getByText('My Body')).toBeInTheDocument();
  });
});

describe('Dialog sub-components', () => {
  it('DialogTitle renders its children within the title element', () => {
    const { container, getByText } = render(<DialogTitle>Title</DialogTitle>);
    expect(container.querySelector('.cw-dialog__title')).toBeInTheDocument();
    expect(getByText('Title')).toBeInTheDocument();
  });

  it('DialogContent renders its children within the content element', () => {
    const { container, getByText } = render(
      <DialogContent>Body</DialogContent>,
    );
    expect(container.querySelector('.cw-dialog__content')).toBeInTheDocument();
    expect(getByText('Body')).toBeInTheDocument();
  });

  it('DialogActions renders its children within the actions element', () => {
    const { container, getByText } = render(
      <DialogActions>
        <button>OK</button>
      </DialogActions>,
    );
    expect(container.querySelector('.cw-dialog__actions')).toBeInTheDocument();
    expect(getByText('OK')).toBeInTheDocument();
  });
});
