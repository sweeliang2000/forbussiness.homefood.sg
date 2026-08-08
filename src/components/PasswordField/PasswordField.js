'use client';

import { useId, useState } from 'react';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';

/**
 * A password input with a show/hide toggle.
 *
 * Every password field in the app was a bare `type="password"` with no way to
 * check what you had typed — which matters most exactly where it was missing:
 * signing in on a phone, and choosing a new password you cannot re-read.
 *
 * Behaviour worth knowing:
 *
 * - `tabIndex={-1}` on the button. Tab should go field -> submit; a keyboard
 *   user does not want a stop on a control they can trigger with the mouse or
 *   reach deliberately. The button is still focusable by click and is fully
 *   labelled for screen readers.
 * - `onMouseDown` preventDefault, so clicking the eye does not pull focus out
 *   of the input. Without it the caret jumps and the field blurs mid-typing.
 * - The `aria-label` flips with state, so the control announces what it will
 *   do next rather than what it currently is.
 * - Visibility is local state and always starts hidden. It deliberately does
 *   not persist across mounts: a revealed password left on screen after a
 *   navigation is a shoulder-surfing problem, not a convenience.
 *
 * Everything else is forwarded to MUI's TextField, so the app theme's outlined
 * variant, radius and focus ring all still apply.
 */
const PasswordField = ({
  label = 'Password',
  autoComplete = 'current-password',
  slotProps,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const toggleId = useId();

  const action = isVisible ? 'Hide password' : 'Show password';

  return (
    <TextField
      {...props}
      label={label}
      type={isVisible ? 'text' : 'password'}
      autoComplete={autoComplete}
      slotProps={{
        ...slotProps,
        input: {
          ...slotProps?.input,
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={action} enterDelay={600}>
                <IconButton
                  id={toggleId}
                  aria-label={action}
                  aria-pressed={isVisible}
                  onClick={() => setIsVisible((shown) => !shown)}
                  onMouseDown={(event) => event.preventDefault()}
                  tabIndex={-1}
                  edge="end"
                  size="small"
                >
                  {isVisible ? (
                    <VisibilityOffRoundedIcon fontSize="small" />
                  ) : (
                    <VisibilityRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};

export default PasswordField;
