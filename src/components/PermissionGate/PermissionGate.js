'use client';

import { cloneElement, isValidElement } from 'react';
import { Tooltip } from '@mui/material';

import { deniedMessage } from '@/lib/permissions';

/**
 * Wraps a control the current role may not use: disables it, and says why on
 * hover. When `allowed`, the child is rendered untouched.
 *
 * The `<span>` is load-bearing. A disabled MUI control fires no pointer events,
 * so a Tooltip attached straight to it never opens — the user would get a dead
 * button and no reason for it. The wrapper still receives the hover.
 */
export default function PermissionGate({
  allowed,
  capability,
  children,
  display = 'inline-flex',
}) {
  if (allowed) return children;

  return (
    <Tooltip title={deniedMessage(capability)}>
      <span style={{ display, cursor: 'not-allowed' }}>
        {isValidElement(children) ? cloneElement(children, { disabled: true }) : children}
      </span>
    </Tooltip>
  );
}
