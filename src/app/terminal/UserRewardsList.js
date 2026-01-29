'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';
import { FaCheck } from 'react-icons/fa6';
import apiClient from '@/utility/api';
import styles from './UserRewardsList.module.css';

const UserRewardsList = ({ phoneNumber, shopId, onRewardSelect }) => {
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedRewardId, setSelectedRewardId] = useState(null);
    const [selectedReward, setSelectedReward] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        if (!phoneNumber) {
            setRewards([]);
            return;
        }

        const fetchRewards = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const params = new URLSearchParams({ phone: phoneNumber });
                if (shopId) {
                    params.append('shop_id', shopId);
                }
                console.log(`/api/mobile/userRewards?${params.toString()}`)
                const response = await apiClient.get(`/api/mobile/userRewards?${params.toString()}`);
                const data = response.data;
                
                console.log('UserRewardsList - Received rewards data:', { count: data?.length, data: data });
                setRewards(data || []);
            } catch (err) {
                console.error('Error fetching user rewards:', err);
                const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to fetch rewards';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchRewards();
    }, [phoneNumber, shopId]);

    const handleCardClick = (reward) => {
        // Toggle selection - if already selected, deselect it
        if (selectedRewardId === reward.id) {
            setSelectedRewardId(null);
            if (onRewardSelect) {
                onRewardSelect(null);
            }
        } else {
            setSelectedRewardId(reward.id);
            if (onRewardSelect) {
                onRewardSelect(reward);
            }
        }
    };

    const handleViewMore = (reward, e) => {
        e.stopPropagation();
        setSelectedRewardId(reward.id);
        setSelectedReward(reward);
        setIsDetailsOpen(true);
        if (onRewardSelect) {
            onRewardSelect(reward);
        }
    };

    const handleCloseDetails = () => {
        setIsDetailsOpen(false);
        setSelectedReward(null);
    };

    if (!phoneNumber) {
        return null;
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingText}>Loading rewards...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorText}>Error: {error}</div>
            </div>
        );
    }

    if (rewards.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyText}>No rewards available</div>
            </div>
        );
    }

    return (
        <>
            <div className={styles.container}>
                <h2 className={styles.title}>Available Rewards</h2>
                <div className={styles.rewardsGrid}>
                    {rewards.map((reward) => {
                        const isSelected = selectedRewardId === reward.id;
                        return (
                            <div
                                key={reward.id}
                                className={`${styles.card} ${isSelected ? styles.selected : ''}`}
                                onClick={() => handleCardClick(reward)}
                            >
                                <div className={`${styles.radioButton} ${isSelected ? styles.selected : ''}`}>
                                    {isSelected && <FaCheck className={styles.checkIcon} />}
                                </div>
                                <Image
                                    src={reward.reward_image || '/images/placeholder/reward_placeholder.png'}
                                    width={200}
                                    height={200}
                                    alt={reward.reward_name || 'Reward'}
                                    className={styles.image}
                                />
                                <div className={styles.content}>
                                    <h3 className={styles.rewardName}>{reward.reward_name || 'Unnamed Reward'}</h3>
                                    <p className={styles.description}>{reward.description || 'No description'}</p>
                                    {reward.expiry_date && (
                                        <p className={styles.expiryDate}>
                                            Expires: {new Date(reward.expiry_date).toLocaleDateString()}
                                        </p>
                                    )}
                                    <button 
                                        className={styles.viewMoreButton}
                                        onClick={(e) => handleViewMore(reward, e)}
                                    >
                                        View More
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Reward Details Modal */}
            <Dialog
                open={isDetailsOpen}
                onClose={handleCloseDetails}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle className={styles.modalHeader}>
                    <span>Reward Details</span>
                    <IconButton onClick={handleCloseDetails} className={styles.closeButton}>
                        <IoCloseSharp />
                    </IconButton>
                </DialogTitle>
                <DialogContent className={styles.modalContent}>
                    {selectedReward && (
                        <div className={styles.detailsContainer}>
                            {selectedReward.reward_image && (
                                <div className={styles.detailImageContainer}>
                                    <Image
                                        src={selectedReward.reward_image || '/images/placeholder/reward_placeholder.png'}
                                        width={300}
                                        height={300}
                                        alt={selectedReward.reward_name || 'Reward'}
                                        className={styles.detailImage}
                                    />
                                </div>
                            )}
                            
                            <div className={styles.detailSection}>
                                <h3 className={styles.detailLabel}>Reward Name</h3>
                                <p className={styles.detailValue}>{selectedReward.reward_name || 'N/A'}</p>
                            </div>

                            {selectedReward.description && (
                                <div className={styles.detailSection}>
                                    <h3 className={styles.detailLabel}>Description</h3>
                                    <p className={styles.detailValue}>{selectedReward.description}</p>
                                </div>
                            )}

                            {selectedReward.expiry_date && (
                                <div className={styles.detailSection}>
                                    <h3 className={styles.detailLabel}>Expiry Date</h3>
                                    <p className={styles.detailValue}>
                                        {new Date(selectedReward.expiry_date).toLocaleString()}
                                    </p>
                                </div>
                            )}

                            {selectedReward.expiry && (
                                <div className={styles.detailSection}>
                                    <h3 className={styles.detailLabel}>Expiry (Days)</h3>
                                    <p className={styles.detailValue}>{selectedReward.expiry}</p>
                                </div>
                            )}

                            {selectedReward.status && (
                                <div className={styles.detailSection}>
                                    <h3 className={styles.detailLabel}>Status</h3>
                                    <p className={styles.detailValue}>{selectedReward.status}</p>
                                </div>
                            )}

                            {selectedReward.card_id && (
                                <div className={styles.detailSection}>
                                    <h3 className={styles.detailLabel}>Card ID</h3>
                                    <p className={styles.detailValue}>{selectedReward.card_id}</p>
                                </div>
                            )}

                            {selectedReward.stamp_position !== null && selectedReward.stamp_position !== undefined && (
                                <div className={styles.detailSection}>
                                    <h3 className={styles.detailLabel}>Stamp Position</h3>
                                    <p className={styles.detailValue}>{selectedReward.stamp_position}</p>
                                </div>
                            )}

                            {selectedReward.info && (
                                <div className={styles.detailSection}>
                                    <h3 className={styles.detailLabel}>Additional Information</h3>
                                    <div className={styles.detailValue}>
                                        {typeof selectedReward.info === 'object' ? (
                                            <pre className={styles.jsonInfo}>
                                                {JSON.stringify(selectedReward.info, null, 2)}
                                            </pre>
                                        ) : (
                                            <p>{selectedReward.info}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedReward.created_at && (
                                <div className={styles.detailSection}>
                                    <h3 className={styles.detailLabel}>Created At</h3>
                                    <p className={styles.detailValue}>
                                        {new Date(selectedReward.created_at).toLocaleString()}
                                    </p>
                                </div>
                            )}

                            {selectedReward.updated_at && (
                                <div className={styles.detailSection}>
                                    <h3 className={styles.detailLabel}>Updated At</h3>
                                    <p className={styles.detailValue}>
                                        {new Date(selectedReward.updated_at).toLocaleString()}
                                    </p>
                                </div>
                            )}

                            {selectedReward.claimed_at && (
                                <div className={styles.detailSection}>
                                    <h3 className={styles.detailLabel}>Claimed At</h3>
                                    <p className={styles.detailValue}>
                                        {new Date(selectedReward.claimed_at).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UserRewardsList;
