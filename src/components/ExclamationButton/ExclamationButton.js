import styles from './ExclamationButton.module.css';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';

const ExclamationButton = ({
    description,
    url
}) => {
  return (
    <Tooltip
      title={
        <Box>
          <p className={styles.text}>{description} <a href={url} target="_blank" rel="noopener noreferrer">Find out more.</a></p>
        </Box>
      }
      arrow
    >
      <IconButton aria-label="more-info">
        <InfoOutlinedIcon style={{ color: 'blue' }} />
      </IconButton>
    </Tooltip>
  );
};

export default ExclamationButton;
