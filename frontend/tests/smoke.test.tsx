import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import RootLayout from '@/app/layout';

describe('frontend smoke', () => {
  it('renders root layout', () => {
    const { container } = render(
      <RootLayout>
        <div>ok</div>
      </RootLayout>
    );
    expect(container.textContent).toContain('ok');
  });
});

