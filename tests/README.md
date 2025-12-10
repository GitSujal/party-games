# Tests

This directory contains comprehensive tests for the Murder Mystery Platform.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `api/` - API validation and logic tests
- `components/` - React component tests
- `lib/` - Utility function tests
- `setup.js` - Test environment setup

## Writing Tests

Tests use Vitest and React Testing Library. Example:

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
    it('should render correctly', () => {
        render(<MyComponent />);
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });
});
```

## API Testing Notes

The API functions (in `functions/api/game.js`) use Cloudflare Workers runtime features. To fully test them:

1. Extract validation functions to separate modules
2. Use Miniflare for integration tests with D1
3. Mock crypto APIs for unit tests

Current tests focus on logic and validation patterns.
