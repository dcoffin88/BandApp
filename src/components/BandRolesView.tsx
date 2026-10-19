import React, { useState } from 'react';
import {
  Check,
  Crown,
  Guitar,
  Info,
  KeyRound,
  Plus,
  Shield,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { Role } from '../types/band.ts';
import { ROLE_PERMISSIONS } from '../shared/defaults.ts';

export const BandRolesView: React.FC = () => {
  const { band, currentUser, permissions, updateUserRole, addBandMember } = useBand();
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [name, setName] = useState('');
  const [instrument, setInstrument] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [email, setEmail] = useState('');

  const isAdmin = permissions.canManageMembers;

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addBandMember({
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@BandApp.app`,
      instrument: instrument.trim() || 'Guitar & Backing',
      role,
      status: 'active',
      avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 500)}?w=150&auto=format&fit=crop&q=80`,
    });

    setIsAddMemberOpen(false);
    setName('');
    setInstrument('');
    setEmail('');
    setRole('member');
  };

  const getRoleDesc = (r: Role) => {
    switch (r) {
      case 'admin':
        return 'Band Admin: Full permissions. Manage members, edit settings, delete tracks.';
      case 'editor':
        return 'Editor: Upload demos, record new takes/versions, edit lyrics, schedule practice.';
      case 'member':
        return 'Band Member: Upload demos/takes, edit lyrics, RSVP to practices, join discussions.';
      case 'guest':
        return 'Session / Guest: Read-only access to lyrics & schedules. Can listen, download takes, comment & RSVP.';
    }
  };

  const roleTypes: Role[] = ['admin', 'editor', 'member', 'guest'];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Band Members &amp; Role-Based Permissions
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Configure access control for songwriting, audio takes versioning, lyrics editing, and scheduling.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddMemberOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Role Permissions Matrix Table */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 overflow-hidden">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>Role Permissions Matrix</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-mono uppercase tracking-wider">
                <th className="py-2.5 px-3">Permission / Capability</th>
                <th className="py-2.5 px-3 text-center">Admin</th>
                <th className="py-2.5 px-3 text-center">Editor</th>
                <th className="py-2.5 px-3 text-center">Member</th>
                <th className="py-2.5 px-3 text-center">Guest / Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              <tr>
                <td className="py-2.5 px-3 font-medium">Upload Audio Demos</td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Add New Audio Takes / Versions</td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Edit Lyrics Drafts &amp; Chords</td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3 text-zinc-500 font-mono text-[10px]">Read-only</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Schedule Band Practice</td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Delete Song Ideas</td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Manage Member Roles &amp; Band Settings</td>
                <td className="text-center py-2.5 px-3"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
                <td className="text-center py-2.5 px-3"><X className="w-4 h-4 text-zinc-600 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Band Roster Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <span>Band Members ({band.members.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {band.members.map(member => {
            const isSelf = member.id === currentUser.id;

            return (
              <div
                key={member.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition ${
                  isSelf
                    ? 'bg-zinc-900 border-amber-500/40 ring-1 ring-amber-500/20'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-700"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">{member.name}</span>
                      {isSelf && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{member.instrument}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{member.email}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Role selector (editable by Admin) */}
                  {isAdmin ? (
                    <select
                      value={member.role}
                      onChange={e => updateUserRole(member.id, e.target.value as Role)}
                      className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="member">Member</option>
                      <option value="guest">Guest</option>
                    </select>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase font-mono">
                      {member.role}
                    </span>
                  )}


                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Add Band Member</span>
              </h3>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Leo Cruz"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Instrument / Role in Band
                </label>
                <input
                  type="text"
                  placeholder="e.g. Drums, Synth, Lead Guitar, Harmonies"
                  value={instrument}
                  onChange={e => setInstrument(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="leo@BandApp.app"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Assigned Permission Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as Role)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-medium"
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="member">Member</option>
                  <option value="guest">Guest / Session</option>
                </select>
                <p className="text-[11px] text-zinc-400 mt-1">{getRoleDesc(role)}</p>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
