import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import ModalShell from '../shared/ModalShell';
import { formatDisplayDate, normalizeName } from '../../lib/utils';

function buildInitialMembers(group, friends) {
  if (!group) {
    return [];
  }

  return group.members
    .map((member) => {
      const friend = friends.find((entry) => entry.id === member.friendId);

      if (!friend) {
        return null;
      }

      return {
        friendId: friend.id,
        label: friend.name,
      };
    })
    .filter(Boolean);
}

export default function GroupModal({
  open,
  onClose,
  group,
  friends,
  onSave,
  onDelete,
}) {
  const [name, setName] = useState('');
  const [memberPicker, setMemberPicker] = useState('');
  const [customMemberName, setCustomMemberName] = useState('');
  const [members, setMembers] = useState([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(group?.name || '');
    setMemberPicker('');
    setCustomMemberName('');
    setMembers(buildInitialMembers(group, friends));
    setIsDeleteConfirmOpen(false);
  }, [open, group, friends]);

  const availableFriends = friends.filter(
    (friend) => !members.some((member) => member.friendId === friend.id),
  );

  const addSelectedFriend = () => {
    const friend = friends.find((entry) => entry.id === memberPicker);

    if (!friend) {
      return;
    }

    setMembers((currentMembers) => [
      ...currentMembers,
      { friendId: friend.id, label: friend.name },
    ]);
    setMemberPicker('');
  };

  const addCustomMember = () => {
    const cleanedName = normalizeName(customMemberName);

    if (
      !cleanedName ||
      members.some(
        (member) => member.label.toLowerCase() === cleanedName.toLowerCase(),
      )
    ) {
      return;
    }

    setMembers((currentMembers) => [
      ...currentMembers,
      {
        name: cleanedName,
        label: cleanedName,
      },
    ]);
    setCustomMemberName('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = onSave({
      groupId: group?.id,
      name,
      members: members.map((member) =>
        member.friendId ? { friendId: member.friendId } : { name: member.label },
      ),
    });

    if (result.success) {
      onClose();
    }
  };

  const handleDelete = () => {
    if (!group || !onDelete) {
      return;
    }

    const result = onDelete(group.id);

    if (result.success) {
      setIsDeleteConfirmOpen(false);
      onClose();
    }
  };

  const confirmMembers = group
    ? [
        { label: 'You', key: 'me' },
        ...group.members.map((member) => ({
          label:
            friends.find((friend) => friend.id === member.friendId)?.name ||
            'Unknown',
          key: member.friendId,
        })),
      ]
    : [];

  return (
    <>
      <ModalShell
        open={open}
        onClose={onClose}
        title={group ? 'Edit group' : 'New group'}
        description="Choose friends or add a new name. New names are also saved to your friends list."
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Group name
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input-field"
            placeholder="Weekend trip"
          />
        </label>

        <div className="space-y-3">
          <span className="block text-sm font-medium text-slate-300">
            Members
          </span>

          <div className="surface-panel space-y-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={memberPicker}
                onChange={(event) => setMemberPicker(event.target.value)}
                className="input-field"
              >
                <option value="">Select an existing friend</option>
                {availableFriends.map((friend) => (
                  <option key={friend.id} value={friend.id}>
                    {friend.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addSelectedFriend}
                className="btn-ghost sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add friend
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={customMemberName}
                onChange={(event) => setCustomMemberName(event.target.value)}
                className="input-field"
                placeholder="Add new person"
              />
              <button
                type="button"
                onClick={addCustomMember}
                className="btn-ghost sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add name
              </button>
            </div>
          </div>

          <p className="text-xs uppercase tracking-[0.2em] text-electric-300/70">
            You are always included in the split.
          </p>

          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <span
                key={member.friendId || member.label}
                className="inline-flex items-center gap-2 rounded-full border border-electric-500/25 bg-electric-500/10 px-3 py-2 text-sm text-electric-200"
              >
                {member.label}
                <button
                  type="button"
                  onClick={() =>
                    setMembers((currentMembers) =>
                      currentMembers.filter(
                        (entry) =>
                          (entry.friendId || entry.label) !==
                          (member.friendId || member.label),
                      ),
                    )
                  }
                  className="rounded-full text-electric-200/70 transition hover:text-electric-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

          {group && onDelete ? (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="btn-danger"
              >
                <Trash2 className="h-4 w-4" />
                Delete Group
              </button>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {group ? 'Save changes' : 'Create group'}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete group"
        description="All data from this group will be permanently lost. This cannot be undone."
        className="max-w-lg"
      >
        {group ? (
          <div className="space-y-5">
            <div className="surface-panel space-y-4 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-400">Group name</span>
                <span className="text-right text-slate-100">{group.name}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-400">Created date</span>
                <span className="text-slate-100">
                  {formatDisplayDate(group.createdAt)}
                </span>
              </div>
              <div>
                <span className="mb-3 block text-sm text-slate-400">
                  Members
                </span>
                <div className="flex flex-wrap gap-2">
                  {confirmMembers.map((member) => (
                    <span
                      key={member.key}
                      className="inline-flex items-center rounded-full border border-electric-500/25 bg-electric-500/10 px-3 py-2 text-sm text-electric-200"
                    >
                      {member.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button type="button" onClick={handleDelete} className="btn-danger">
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        ) : null}
      </ModalShell>
    </>
  );
}
