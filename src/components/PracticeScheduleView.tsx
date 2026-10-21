import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  HelpCircle,
  ListMusic,
  MapPin,
  Pencil,
  Play,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext.tsx';
import { useBand } from '../context/BandContext.tsx';
import { PracticeSession, SongIdea } from '../types/band.ts';

export const PracticeScheduleView: React.FC = () => {
  const { practices, songs, currentUser, permissions, addPracticeSession, updatePracticeSession, updateRsvp, deletePracticeSession } = useBand();
  const { playSong } = useAudioPlayer();

  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const [editingPracticeId, setEditingPracticeId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('22:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [goalInput, setGoalInput] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [eventReminderOneDay, setEventReminderOneDay] = useState(true);
  const [eventReminderFourHours, setEventReminderFourHours] = useState(true);

  const canSchedule = permissions.canSchedulePractice;

  const resetPracticeForm = () => {
    setEditingPracticeId(null);
    setTitle('');
    setDate('');
    setStartTime('19:00');
    setEndTime('22:00');
    setLocation('');
    setNotes('');
    setSelectedSongIds([]);
    setGoalInput('');
    setGoals([]);
    setEventReminderOneDay(true);
    setEventReminderFourHours(true);
  };

  const openCreatePractice = () => {
    resetPracticeForm();
    setIsPracticeModalOpen(true);
  };

  const openEditPractice = (practice: PracticeSession) => {
    setEditingPracticeId(practice.id);
    setTitle(practice.title);
    setDate(practice.date);
    setStartTime(practice.startTime);
    setEndTime(practice.endTime);
    setLocation(practice.location);
    setNotes(practice.notes);
    setSelectedSongIds([...practice.setlistSongIds]);
    setGoalInput('');
    setGoals([...practice.goals]);
    setEventReminderOneDay(practice.eventReminderOneDay ?? true);
    setEventReminderFourHours(practice.eventReminderFourHours ?? true);
    setIsPracticeModalOpen(true);
  };

  const closePracticeModal = () => {
    setIsPracticeModalOpen(false);
    resetPracticeForm();
  };

  const handleToggleSongInSetlist = (songId: string) => {
    setSelectedSongIds(prev =>
      prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId]
    );
  };

  const handleAddGoal = () => {
    if (goalInput.trim()) {
      setGoals([...goals, goalInput.trim()]);
      setGoalInput('');
    }
  };

  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleSavePractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const session = {
      title: title.trim(),
      date,
      startTime,
      endTime,
      location: location.trim() || 'Band Rehearsal Space',
      setlistSongIds: selectedSongIds,
      goals,
      notes: notes.trim(),
      eventReminderOneDay,
      eventReminderFourHours,
    };
    const saved = editingPracticeId
      ? await updatePracticeSession(editingPracticeId, session)
      : await addPracticeSession(session);

    if (!saved) return;
    closePracticeModal();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Band Practice Schedule
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Coordinate upcoming rehearsals, track RSVPs, and assign demo songs to work on.
          </p>
        </div>

        {canSchedule && (
          <button
            onClick={openCreatePractice}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Schedule Practice</span>
          </button>
        )}
      </div>

      {/* Practice Cards List */}
      <div className="space-y-4">
        {practices.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 text-zinc-500">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40 text-amber-400" />
            <p className="text-sm font-medium text-zinc-300">No practice sessions scheduled yet.</p>
            {canSchedule && (
              <p className="text-xs text-zinc-500 mt-1">
                Click "+ Schedule Practice" to plan the next rehearsal.
              </p>
            )}
          </div>
        ) : (
          practices.map(practice => {
            const myRsvp = practice.rsvps.find(r => r.userId === currentUser.id)?.status;
            const setlistSongs = songs.filter(s => practice.setlistSongIds.includes(s.id));

            return (
              <div
                key={practice.id}
                className="p-5 sm:p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700/80 transition space-y-4"
              >
                {/* Top Info */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        {new Date(practice.date + 'T12:00:00').toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {practice.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>
                          {practice.startTime} - {practice.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{practice.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    {canSchedule && (
                      <button
                        type="button"
                        onClick={() => openEditPractice(practice)}
                        className="text-zinc-400 hover:text-amber-300 p-1.5 rounded-lg hover:bg-amber-500/10 transition"
                        title="Edit practice session"
                        aria-label={`Edit ${practice.title}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {permissions.canManageMembers && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove practice session "${practice.title}"?`)) {
                            deletePracticeSession(practice.id);
                          }
                        }}
                        className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
                        title="Delete practice session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Goals & Notes */}
                {practice.goals && practice.goals.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Rehearsal Goals:
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
                      {practice.goals.map((goal, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80">
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Linked Rehearsal Setlist */}
                {setlistSongs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ListMusic className="w-3.5 h-3.5 text-amber-400" />
                      <span>Rehearsal Setlist ({setlistSongs.length} tracks to practice):</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {setlistSongs.map(song => (
                        <div
                          key={song.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs group hover:border-zinc-700 transition"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-zinc-200 truncate">{song.title}</p>
                            <p className="text-[11px] text-zinc-500 uppercase">{song.category} • {song.bpm ? `${song.bpm} BPM` : 'Idea'}</p>
                          </div>
                          <button
                            onClick={() => playSong(song)}
                            className="p-1.5 rounded-full bg-zinc-800 group-hover:bg-amber-500 group-hover:text-zinc-950 text-zinc-300 transition shrink-0"
                            title={`Play ${song.title} audio demo`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Member RSVPs & Current User RSVP buttons */}
                <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Attendance roster */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-zinc-500 text-[11px] font-semibold uppercase mr-1">
                      RSVPs:
                    </span>
                    {practice.rsvps.map((rsvp, idx) => {
                      const color =
                        rsvp.status === 'attending'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : rsvp.status === 'tentative'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30';

                      return (
                        <span
                          key={idx}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] ${color}`}
                        >
                          <img
                            src={rsvp.userAvatar}
                            alt={rsvp.userName}
                            className="w-3.5 h-3.5 rounded-full object-cover"
                          />
                          <span>{rsvp.userName}</span>
                          <span className="opacity-70 text-[9px] uppercase font-mono">
                            ({rsvp.status === 'attending' ? 'Going' : rsvp.status === 'tentative' ? 'Maybe' : 'Out'})
                          </span>
                        </span>
                      );
                    })}
                  </div>

                  {/* Interactive RSVP buttons for current user */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                    <span className="text-[11px] text-zinc-500 px-2 font-medium">Your RSVP:</span>
                    <button
                      onClick={() => updateRsvp(practice.id, 'attending')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        myRsvp === 'attending'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-emerald-300 hover:bg-zinc-900'
                      }`}
                    >
                      Going
                    </button>
                    <button
                      onClick={() => updateRsvp(practice.id, 'tentative')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        myRsvp === 'tentative'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-900'
                      }`}
                    >
                      Maybe
                    </button>
                    <button
                      onClick={() => updateRsvp(practice.id, 'declined')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        myRsvp === 'declined'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-rose-300 hover:bg-zinc-900'
                      }`}
                    >
                      Can't Make It
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Schedule Practice Modal */}
      {isPracticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-lg">
                  {editingPracticeId ? 'Edit Rehearsal' : 'Schedule Rehearsal'}
                </h3>
              </div>
              <button
                onClick={closePracticeModal}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePractice} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Rehearsal Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Studio Run-Through, Writing Session, Show Prep..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Studio / Rehearsal Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sonic Vault Studios, Alex's Garage..."
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <fieldset className="space-y-2">
                <legend className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Event Reminders
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventReminderOneDay}
                      onChange={(event) => setEventReminderOneDay(event.target.checked)}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    <span className="font-semibold text-zinc-300">1 day before</span>
                  </label>
                  <label className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventReminderFourHours}
                      onChange={(event) => setEventReminderFourHours(event.target.checked)}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    <span className="font-semibold text-zinc-300">4 hours before</span>
                  </label>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Sent only to active members who RSVP Going.
                </p>
              </fieldset>

              {/* Setlist selection */}
              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Select Songs to Rehearse
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-zinc-950 border border-zinc-800 rounded-lg">
                  {songs.map(song => {
                    const isSelected = selectedSongIds.includes(song.id);
                    return (
                      <button
                        type="button"
                        key={song.id}
                        onClick={() => handleToggleSongInSetlist(song.id)}
                        className={`p-2 rounded-lg text-left transition flex items-center justify-between border ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="font-semibold truncate">{song.title}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Goals */}
              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Rehearsal Goals
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Nail transition into chorus..."
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGoal();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddGoal}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
                {goals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {goals.map((g, idx) => (
                      <span key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px]">
                        {g}
                        <button type="button" onClick={() => handleRemoveGoal(idx)} className="hover:text-rose-400">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closePracticeModal}
                  className="px-4 py-2 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || !date}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  {editingPracticeId ? 'Update Practice' : 'Save Practice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
