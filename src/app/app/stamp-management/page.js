'use client'
import { useState } from 'react';
import StampOnBoarding from './StampOnboarding/StampOnboarding';
import StampSetup from './StampSetup/stamp-setup';

const StampManagement = () => {
    const [isOnboardingShown, SetIsOnBoardingShown] = useState(true);
    const [isSetup, SetIsSetup] = useState(true);

    return(
        <StampSetup/>
    )
};

export default StampManagement;