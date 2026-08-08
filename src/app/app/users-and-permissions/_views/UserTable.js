'use client';
import { useState } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { LuUsers } from 'react-icons/lu';
import apiClient from '@/utility/api';
import { DELETE_USER_FROM_SHOP } from '@/utility/apiPaths';
import AlertModal from '@/components/AlertModal/AlertModal';
import AddUsersDialog from './AddUsersDialog';
import MemberSessions from './MemberSessions';
import styles, { Identity, RolePill, ListCard, EmptyState, SkeletonRows } from './MemberList';

// Who may inspect sessions and revoke them. Mirrors the server, which is the
// real gate — this only decides whether to offer the affordance.
const SESSION_ADMIN_ROLES = ['Owner', 'Manager'];

const UserTable = ({
    usersRows,
    currentUserEmail,
    currentUserRole,
    isLoading = false,
    onUserUpdated,
    onUserDeleted,
    onDeleteError,
    onSessionsRevoked,
    onInvite
}) => {
    // One menu for the whole table, anchored to whichever button was
    // pressed — rendering a Menu per row mounts one popover per person.
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [menuUser, setMenuUser] = useState(null);

    const [editingUser, setEditingUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [sessionsUser, setSessionsUser] = useState(null);

    const isSessionAdmin = SESSION_ADMIN_ROLES.includes(currentUserRole);

    const isSelf = (user) =>
        !!currentUserEmail && user?.email?.toLowerCase() === currentUserEmail.toLowerCase();

    /*
      Your own sessions are self-service — any role may look at them and end
      them. Reaching another member needs Owner or Manager, and a Manager
      can't reach an Owner. All three rules are enforced server-side; this
      only decides whether to offer the affordance.
    */
    const canViewSessions = (user) =>
        !!user &&
        (isSelf(user) ||
            (isSessionAdmin && !(user.role === 'Owner' && currentUserRole !== 'Owner')));

    const openMenu = (event, user) => {
        setMenuAnchor(event.currentTarget);
        setMenuUser(user);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
        setMenuUser(null);
    };

    const handleEdit = () => {
        setEditingUser(menuUser);
        closeMenu();
    };

    const handleDeleteClick = () => {
        setUserToDelete(menuUser);
        closeMenu();
    };

    const handleConfirmDelete = async () => {
        if (isDeleting || !userToDelete) return;

        const user = userToDelete;
        setIsDeleting(true);

        try {
            const response = await apiClient.delete(DELETE_USER_FROM_SHOP, {
                data: { email: user.email }
            });

            if (response.data.success) {
                setUserToDelete(null);
                if (onUserDeleted) onUserDeleted(user);
            } else if (onDeleteError) {
                onDeleteError(new Error(response.data.message || 'Failed to remove user.'));
            }
        } catch (error) {
            console.error('Error removing user:', error);
            if (onDeleteError) onDeleteError(error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <ListCard title="Team members" count={isLoading ? undefined : usersRows.length}>
                {isLoading ? (
                    <SkeletonRows rows={3} />
                ) : usersRows.length === 0 ? (
                    <EmptyState icon={<LuUsers />} title="No one else has access yet">
                        Invite a teammate to let them manage your menu, take orders and
                        handle your shop with you.
                    </EmptyState>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th scope="col">Member</th>
                                    <th scope="col" className={styles.roleCell}>Role</th>
                                    <th scope="col" className={styles.actionsCell}>
                                        <span className={styles.srOnly}>Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersRows.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={canViewSessions(user) ? styles.clickableRow : ''}
                                        onClick={
                                            canViewSessions(user)
                                                ? () => setSessionsUser(user)
                                                : undefined
                                        }
                                    >
                                        <td>
                                            <Identity email={user.email} isYou={isSelf(user)} />
                                        </td>
                                        <td className={styles.roleCell}>
                                            <RolePill role={user.role} />
                                        </td>
                                        <td className={styles.actionsCell}>
                                            <IconButton
                                                size="small"
                                                className={styles.actionButton}
                                                onClick={(event) => {
                                                    // Otherwise this also opens the sessions sheet.
                                                    event.stopPropagation();
                                                    openMenu(event, user);
                                                }}
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
                )}
            </ListCard>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                // Grow from the button that opened it, so the menu reads as
                // belonging to that row rather than arriving from nowhere.
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                {canViewSessions(menuUser) && (
                    <MenuItem
                        onClick={() => {
                            setSessionsUser(menuUser);
                            closeMenu();
                        }}
                    >
                        Sessions &amp; sign-in history
                    </MenuItem>
                )}
                <MenuItem onClick={handleEdit}>Change role</MenuItem>
                {/* Revoking your own access would lock you out of the shop with
                    no way back in. Sessions are the self-service action here. */}
                {!isSelf(menuUser) && (
                    <MenuItem onClick={handleDeleteClick} className={styles.destructive}>
                        Remove access
                    </MenuItem>
                )}
            </Menu>

            <MemberSessions
                member={sessionsUser}
                isSelf={isSelf(sessionsUser)}
                isOpen={Boolean(sessionsUser)}
                onClose={() => setSessionsUser(null)}
                onSignedOut={onSessionsRevoked}
                onError={onDeleteError}
            />

            <AddUsersDialog
                isOpen={Boolean(editingUser)}
                closeAddUserHandler={() => setEditingUser(null)}
                onUserInvited={(updated) => {
                    setEditingUser(null);
                    if (onUserUpdated) onUserUpdated(updated);
                }}
                editingUser={editingUser}
                isEditMode={true}
            />

            {/*
              Revoking access is reversible — you can invite the person
              back — so it gets a plain confirmation naming the action,
              not a type-the-word-to-proceed gate. That friction belongs
              on things you genuinely can't undo.
            */}
            <AlertModal
                open={Boolean(userToDelete)}
                onClose={() => !isDeleting && setUserToDelete(null)}
                title="Remove access"
                description={
                    <div>
                        <p style={{ marginBottom: '10px' }}>
                            <strong>{userToDelete?.email}</strong> will immediately lose access
                            to this shop.
                        </p>
                        <p>You can invite them again at any time.</p>
                    </div>
                }
                onAction={handleConfirmDelete}
                actionButtonText={isDeleting ? 'Removing…' : 'Remove access'}
                actionDisabled={isDeleting}
                type="error"
                showActionButton={true}
            />
        </>
    );
};

export default UserTable;
