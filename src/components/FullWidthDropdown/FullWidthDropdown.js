'use client';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useState } from 'react';


{/* 
  Example Usages:

  <FullWidthDropdown
  options={EXPIRATION_TYPE_OPTIONS}
  labelId='expiration_type'
  id='expiration_type'
  value='validForDays'
  onChange={() => { }}
/> 
*/}
const FullWidthDropdown = ({
  options,
  ...rest
}) => (
  <FormControl fullWidth>
    <Select
      fullWidth
      {...rest}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.title}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);;

export default FullWidthDropdown;
