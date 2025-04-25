import React from 'react';
import styles from './StampCard.module.css';
import CheckmarkIcon from './CheckmarkIcon';
import Image from 'next/image';

const StampCard = ({
  title,
  description,
  rewardImage,
  totalStamps,
  collectedStamps,
  expiryDate,
  spendAmount,
  cardBackground,
  cardTitleColor,
  cardFooterColor,
  cardNoStampBorderColor,
  cardStampBackground,
  cardNoStampBackgroundColor,
  cardStampCollectedBorderColor,
  checkmarkColor,
  prizeSteps = []
}) => {
  // Ensure totalStamps is within bounds (5-16)
  const validTotalStamps = Math.min(Math.max(totalStamps, 5), 18);
  
  // Process prize steps - if only one step is provided, add the total stamps as the last step
  const processedPrizeSteps = [...prizeSteps];
  if (processedPrizeSteps.length === 1 && processedPrizeSteps[0] < validTotalStamps) {
    processedPrizeSteps.push(validTotalStamps);
  }
  
  // Check if a stamp index is a prize step
  const isPrizeStep = (index) => {
    return processedPrizeSteps.includes(index + 1);
  };
  
  const renderStamps = () => {
    const stamps = [];
    const maxStampsPerRow = 6;
    const totalStamps = validTotalStamps;
    
    // Calculate number of rows and stamps per row
    let rows = Math.ceil(totalStamps / maxStampsPerRow);
    let stampsPerRow = Math.ceil(totalStamps / rows);
    
    // Ensure even distribution for more than 6 stamps
    if (totalStamps > 12) {
        rows = 3;
        stampsPerRow = Math.ceil(totalStamps / 3);
    } else if (totalStamps > 6) {
        rows = 2;
        stampsPerRow = Math.ceil(totalStamps / 2);
    }
    
    for (let row = 0; row < rows; row++) {
      const startIdx = row * stampsPerRow;
      const endIdx = Math.min(startIdx + stampsPerRow, totalStamps);
      
      const rowStamps = [];
      // Fill the entire row with stamps, even if some are empty
      for (let i = 0; i < stampsPerRow; i++) {
        const stampIndex = startIdx + i;
        // Only render stamps up to the total number of stamps
        if (stampIndex < totalStamps) {
          const isCollected = stampIndex < collectedStamps;
          const isPrize = isPrizeStep(stampIndex);
          
          rowStamps.push(
            <div 
              key={i} 
              className={`${styles.stamp} ${isCollected ? styles.stampCollected : ''} ${isPrize ? styles.stampPrize : ''}`}
              style={{
                borderColor: isCollected ? (cardStampCollectedBorderColor || cardStampBackground) : cardNoStampBorderColor,
                backgroundColor: isCollected ? cardStampBackground : cardNoStampBackgroundColor
              }}
            >
              {isPrize ? (
                <div className={styles.prizeImageContainer}>
                  <Image 
                    src={isCollected ? "/images/stamps/stampped-prize.png" : "/images/stamps/unstampped-prize.png"} 
                    alt={isCollected ? "Stamped Prize" : "Unstamped Prize"}
                    width={24}
                    height={24}
                    className={styles.prizeImage}
                  />
                </div>
              ) : isCollected && (
                <CheckmarkIcon 
                  color={checkmarkColor || '#ffffff'} 
                  className={styles.checkmark}
                />
              )}
            </div>
          );
        } else {
          // Add an empty div to maintain the grid layout
          rowStamps.push(<div key={i} className={styles.stampEmpty} />);
        }
      }
      
      stamps.push(
        <div 
          key={`row-${row}`} 
          className={styles.stampRow}
        >
          {rowStamps}
        </div>
      );
    }
    return stamps;
  };

  return (
    <div className={styles.container} style={{ backgroundColor: cardBackground }}>
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <h2 className={styles.title} style={{ color: cardTitleColor }}>{title}</h2>
          <p className={styles.subtitle}>
            {description || `Earn a stamp when you spend RM${spendAmount.toFixed(2)}`}
          </p>
        </div>
        {rewardImage && (
          <img 
            src={rewardImage} 
            alt="Reward"
            className={styles.rewardImage}
          />
        )}
      </div>

      <div className={styles.stampContainer}>
        {renderStamps()}
      </div>

      <div className={styles.footer}>
        <p className={styles.expiryText} style={{ color: cardFooterColor }}>
          Collect all stamps by {expiryDate}
        </p>
      </div>
    </div>
  );
};

export default StampCard; 