'use client';
import { useState } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import apiClient from '@/utility/api';
import { DELETE_INVITED_USER, RESEND_INVITATION } from '@/utility/apiPaths';
import AlertModal from '@/components/AlertModal/AlertModal';
import styles, { Identity, RolePill, StatusPill, ListCard } from './MemberList';

const InvitedUserTable = ({
    invitedUsersRows,
    onResendSuccess,
    onResendError,
    onDeleteSuccess,
    onDeleteError
}) => {
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [menuUser, setMenuUser] = useState(null);
    const [inviteToRevoke, setInviteToRevoke] = useState(null);
    const [pendingEmail, setPendingEmail] = useState(null);

    const openMenu = (event, user) => {
        setMenuAnchor(event.currentTarget);
        setMenuUser(user);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
        setMenuUser(null);
    };

    const handleResend = async () => {
        const user = menuUser;
        closeMenu();
        if (!user || pendingEmail) return;

        setPendingEmail(user.email);
        try {
            await apiClient.post(RESEND_INVITATION, { receiverEmail: user.email });
            if (onResendSuccess) onResendSuccess(user.email);
        } catch (error) {
            console.error('Error resending invitation:', error);
            if (onResendError) onResendError(error);
        } finally {
            setPendingEmail(null);
        }
    };

    const handleRevokeClick = () => {
        setInviteToRevoke(menuUser);
        closeMenu();
    };

    const handleConfirmRevoke = async () => {
        const user = inviteToRevoke;
        if (!user || pendingEmail) return;

        setPendingEmail(user.email);
        try {
            const response = await apiClient.delete(DELETE_INVITED_USER, {
                data: { email: user.email }
            });

            if (response.data.success) {
                setInviteToRevoke(null);
                if (onDeleteSuccess) onDeleteSuccess(user.email);
            } else if (onDeleteError) {
                onDeleteError(new Error(response.data.message || 'Failed to revoke invite.'));
            }
        } catch (error) {
            console.error('Error revoking invitation:', error);
            if (onDeleteError) onDeleteError(error);
        } finally {
            setPendingEmail(null);
        }
    };

    return (
        <>
            <ListCard title="Pending invites" count={invitedUsersRows.length}>
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th scope="col">Invitee</th>
                                <th scope="col" className={styles.roleCell}>Role</th>
                                <th scope="col" className={styles.statusCell}>Status</th>
                                <th scope="col" className={styles.actionsCell}>
                                    <span className={styles.srOnly}>Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {invitedUsersRows.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <Identity email={user.email} />
                                    </td>
                                    <td className={styles.roleCell}>
                                        <RolePill role={user.role} />
                                    </td>
                                    <td className={styles.statusCell}>
                                        <StatusPill status={user.status} />
                                    </td>
                                    <td className={styles.actionsCell}>
                                        <IconButton
                                            size="small"
                                            className={styles.actionButton}
                                            disabled={pendingEmail === user.email}
                                            onClick={(event) => openMenu(event, user)}
                                            aria-label={`Actions for ${user.email}`}
                                        >
                                            <MoreVertIcon fontSize="small" />
                                        </IconButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ListCard>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem onClick={handleResend}>Resend invite</MenuItem>
                <MenuItem onClick={handleRevokeClick} className={styles.destructive}>
                    Revoke invite
                </MenuItem>
            </Menu>

            <AlertModal
                open={Boolean(inviteToRevoke)}
                onClose={() => !pendingEmail && setInviteToRevoke(null)}
                title="Revoke invite"
                description={
                    <div>
                        <p style={{ marginBottom: '10px' }}>
                            The invitation for <strong>{inviteToRevoke?.email}</strong> will stop
                            working.
                        </p>
                        <p>You can invite them again at any time.</p>
                    </div>
                }
                onAction={handleConfirmRevoke}
                actionButtonText={pendingEmail ? 'Revoking…' : 'Revoke invite'}
                actionDisabled={Boolean(pendingEmail)}
                type="error"
                showActionButton={true}
            />
        </>
    );
};

export default InvitedUserTable;
