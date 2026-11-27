"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type ViewMode = "month" | "week" | "day";
type EventType = "meeting" | "task" | "project";

type Department = {
  id: string;
  name: string;
};

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  meeting_type: string;
  visibility: string;
  status: string;
  host_member_id: string;
  department_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  department_id: string | null;
  project_id: string | null;
  assigned_to_member_id: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  manager_member_id: string | null;
  status: string;
  progress: number | null;
  start_date: string | null;
  due_date: string | null;
};

type CalendarEvent = {
  id: string;
  sourceId: string;
  type: EventType;
  title: string;
  description: string;
  date: string;
  endDate?: string | null;
  time?: string | null;
  endTime?: string | null;
  status: string;
  departmentId: string | null;
  priority?: string;
  progress?: number;
  locationLabel: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getWeekStart(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) return "";

  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventColor(type: EventType) {
  switch (type) {
    case "meeting":
      return {
        background: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        dot: "bg-blue-500",
      };
    case "task":
      return {
        background: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "project":
      return {
        background: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
        dot: "bg-purple-500",
      };
  }
}

function eventTypeLabel(type: EventType) {
  if (type === "meeting") return "Meeting";
  if (type === "task") return "Task deadline";
  return "Project milestone";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default function CalendarPage() {
  const supabase = useMemo(() => createClient(), []);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Deterministic initial date prevents the prerendering error.
  // The real current date is applied after the component mounts.
  const [selectedDate, setSelectedDate] = useState(new Date(2000, 0, 1));
  const [todayDate, setTodayDate] = useState<Date | null>(null);

  const [view, setView] = useState<ViewMode>("month");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [typeFilters, setTypeFilters] = useState<EventType[]>([
    "meeting",
    "task",
    "project",
  ]);

  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in to view the calendar.");

      const organisationId = window.localStorage.getItem(
        "talvorah_organisation_id"
      );

      if (!organisationId) {
        setDepartments([]);
        setMeetings([]);
        setTasks([]);
        setProjects([]);
        throw new Error("Select an organisation to view its calendar.");
      }

      const [
        departmentResult,
        meetingResult,
        taskResult,
        projectResult,
      ] = await Promise.all([
        supabase
          .from("departments")
          .select("id,name")
          .eq("organisation_id", organisationId)
          .order("name"),

        supabase
          .from("meetings")
          .select(
            "id,title,description,meeting_type,visibility,status,host_member_id,department_id,scheduled_start,scheduled_end"
          )
          .eq("organisation_id", organisationId)
          .not("scheduled_start", "is", null)
          .order("scheduled_start"),

        supabase
          .from("tasks")
          .select(
            "id,title,description,department_id,project_id,assigned_to_member_id,priority,status,due_date,created_at"
          )
          .eq("organisation_id", organisationId)
          .not("due_date", "is", null)
          .order("due_date"),

        supabase
          .from("projects")
          .select(
            "id,name,description,department_id,manager_member_id,status,progress,start_date,due_date"
          )
          .eq("organisation_id", organisationId)
          .order("start_date"),
      ]);

      if (departmentResult.error) throw departmentResult.error;
      if (meetingResult.error) throw meetingResult.error;
      if (taskResult.error) throw taskResult.error;
      if (projectResult.error) throw projectResult.error;

      setDepartments((departmentResult.data || []) as Department[]);
      setMeetings((meetingResult.data || []) as Meeting[]);
      setTasks((taskResult.data || []) as Task[]);
      setProjects((projectResult.data || []) as Project[]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Calendar loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load calendar records."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const now = new Date();

    setSelectedDate(now);
    setTodayDate(now);

    loadCalendar();

    const handleOrganisationChange = () => {
      setSelectedEvent(null);
      setDepartmentFilter("all");
      loadCalendar();
    };

    window.addEventListener(
      "talvorah:organisation-changed",
      handleOrganisationChange
    );

    return () => {
      window.removeEventListener(
        "talvorah:organisation-changed",
        handleOrganisationChange
      );
    };
  }, [loadCalendar]);

  const allEvents: CalendarEvent[] = useMemo(() => {
    const meetingEvents: CalendarEvent[] = meetings
      .filter((meeting) => !!meeting.scheduled_start)
      .map((meeting) => ({
        id: `meeting-${meeting.id}`,
        sourceId: meeting.id,
        type: "meeting",
        title: meeting.title,
        description: meeting.description || "No meeting description provided.",
        date: localDateKey(new Date(meeting.scheduled_start!)),
        time: meeting.scheduled_start,
        endTime: meeting.scheduled_end,
        status: meeting.status,
        departmentId: meeting.department_id,
        locationLabel:
          meeting.meeting_type === "instant"
            ? "Instant meeting"
            : "Scheduled meeting",
      }));

    const taskEvents: CalendarEvent[] = tasks
      .filter((task) => !!task.due_date)
      .map((task) => ({
        id: `task-${task.id}`,
        sourceId: task.id,
        type: "task",
        title: task.title,
        description: task.description || "No task description provided.",
        date: task.due_date!,
        status: task.status,
        departmentId: task.department_id,
        priority: task.priority,
        locationLabel: "Task deadline",
      }));

    const projectEvents: CalendarEvent[] = [];

    projects.forEach((project) => {
      if (project.start_date) {
        projectEvents.push({
          id: `project-start-${project.id}`,
          sourceId: project.id,
          type: "project",
          title: `${project.name} — Start`,
          description: project.description || "Project start date.",
          date: project.start_date,
          endDate: project.due_date,
          status: project.status,
          departmentId: project.department_id,
          progress: project.progress || 0,
          locationLabel: "Project start",
        });
      }

      if (
        project.due_date &&
        project.due_date !== project.start_date
      ) {
        projectEvents.push({
          id: `project-due-${project.id}`,
          sourceId: project.id,
          type: "project",
          title: `${project.name} — Deadline`,
          description: project.description || "Project deadline.",
          date: project.due_date,
          endDate: project.due_date,
          status: project.status,
          departmentId: project.department_id,
          progress: project.progress || 0,
          locationLabel: "Project deadline",
        });
      }
    });

    return [...meetingEvents, ...taskEvents, ...projectEvents].sort(
      (a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;

        return (a.time || "").localeCompare(b.time || "");
      }
    );
  }, [meetings, tasks, projects]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const matchesType = typeFilters.includes(event.type);

      const matchesDepartment =
        departmentFilter === "all" ||
        event.departmentId === departmentFilter;

      return matchesType && matchesDepartment;
    });
  }, [allEvents, typeFilters, departmentFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    filteredEvents.forEach((event) => {
      const existing = map.get(event.date) || [];
      existing.push(event);
      map.set(event.date, existing);
    });

    return map;
  }, [filteredEvents]);

  const selectedDateKey = localDateKey(selectedDate);
  const selectedDayEvents = eventsByDate.get(selectedDateKey) || [];

  const todayKey = todayDate ? localDateKey(todayDate) : "";

  const todayEvents = filteredEvents.filter(
    (event) => event.date === todayKey
  );

  const upcomingEvents = filteredEvents
    .filter((event) => event.date >= todayKey)
    .slice(0, 5);

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const monthCells = useMemo(() => {
    const firstDay = getMonthStart(selectedDate);
    const start = getWeekStart(firstDay);

    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate);

    return Array.from({ length: 7 }, (_, index) =>
      addDays(start, index)
    );
  }, [selectedDate]);

  function movePeriod(direction: number) {
    setSelectedDate((current) => {
      const next = new Date(current);

      if (view === "month") {
        next.setDate(1);
        next.setMonth(next.getMonth() + direction);
      } else if (view === "week") {
        next.setDate(next.getDate() + direction * 7);
      } else {
        next.setDate(next.getDate() + direction);
      }

      return next;
    });
  }

  function goToToday() {
    const now = new Date();
    setSelectedDate(now);
    setTodayDate(now);
  }

  function toggleType(type: EventType) {
    setTypeFilters((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    );
  }

  function selectCalendarEvent(event: CalendarEvent) {
    setSelectedEvent(event);
  }

  function getDepartmentName(id: string | null) {
    if (!id) return "Organisation-wide / not specified";

    return (
      departments.find((department) => department.id === id)?.name ||
      "Department"
    );
  }

  function getEventTimeLabel(event: CalendarEvent) {
    if (event.type !== "meeting" || !event.time) {
      return event.locationLabel;
    }

    const start = formatTime(event.time);
    const end = formatTime(event.endTime);

    return end ? `${start} – ${end}` : start;
  }

  function renderEventChip(event: CalendarEvent) {
    const color = eventColor(event.type);

    return (
      <button
        key={event.id}
        onClick={(e) => {
          e.stopPropagation();
          selectCalendarEvent(event);
        }}
        className={`mb-1 block w-full truncate rounded-md border px-2 py-1 text-left text-[10px] font-medium ${color.background} ${color.text} ${color.border} hover:brightness-95`}
        title={`${event.title} · ${eventTypeLabel(event.type)}`}
      >
        {event.type === "meeting" && event.time
          ? `${formatTime(event.time)} `
          : ""}
        {event.title}
      </button>
    );
  }

  function renderEventCard(event: CalendarEvent) {
    const color = eventColor(event.type);

    return (
      <button
        key={event.id}
        onClick={() => selectCalendarEvent(event)}
        className="flex w-full items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-slate-50"
      >
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#142d4e]">
            {event.title}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {eventTypeLabel(event.type)}
            {event.type === "meeting" && event.time
              ? ` · ${getEventTimeLabel(event)}`
              : ""}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] capitalize ${color.background} ${color.text}`}
        >
          {statusLabel(event.status)}
        </span>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              WORKSPACE / PLANNING
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-[#142d4e] sm:text-3xl">
              Calendar
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Keep track of meetings, task deadlines and project milestones.
            </p>

            {lastUpdated && (
              <p className="mt-2 text-xs text-slate-400">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadCalendar}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              ↻ Refresh
            </button>

            <button
              onClick={goToToday}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Today
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Today's events</p>
              <span className="text-lg">📅</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-[#142d4e]">
              {todayEvents.length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Across all visible categories
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Meetings</p>
              <span className="text-lg">🎥</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {filteredEvents.filter((event) => event.type === "meeting").length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Scheduled meeting records
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Upcoming items</p>
              <span className="text-lg">⏳</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-purple-700">
              {filteredEvents.filter((event) => event.date >= todayKey).length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Today and future dates
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => movePeriod(-1)}
                  aria-label="Previous period"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ‹
                </button>

                <h2 className="min-w-[170px] text-lg font-bold text-[#142d4e]">
                  {view === "day"
                    ? formatLongDate(selectedDate)
                    : view === "week"
                      ? `${formatShortDate(weekDays[0])} – ${formatShortDate(weekDays[6])}`
                      : formatMonth(selectedDate)}
                </h2>

                <button
                  onClick={() => movePeriod(1)}
                  aria-label="Next period"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ›
                </button>
              </div>

              <div className="flex rounded-lg bg-slate-100 p-1">
                {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setView(mode)}
                    className={`rounded-md px-4 py-2 text-xs font-semibold capitalize transition ${
                      view === mode
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-4">
              {(
                [
                  ["meeting", "Meetings"],
                  ["task", "Task deadlines"],
                  ["project", "Projects"],
                ] as [EventType, string][]
              ).map(([type, label]) => {
                const color = eventColor(type);

                return (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2 text-xs text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={typeFilters.includes(type)}
                      onChange={() => toggleType(type)}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
                    {label}
                  </label>
                );
              })}

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="ml-auto max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-emerald-500"
              >
                <option value="all">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-28">
                <div className="mb-4 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                <p className="text-sm text-slate-500">
                  Loading calendar...
                </p>
              </div>
            ) : (
              <>
                {view === "month" && (
                  <div className="overflow-x-auto">
                    <div className="min-w-[650px]">
                      <div className="grid grid-cols-7 border-b border-slate-100">
                        {WEEKDAYS.map((day) => (
                          <div
                            key={day}
                            className="pb-3 text-center text-xs font-semibold text-slate-400"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7">
                        {monthCells.map((date) => {
                          const key = localDateKey(date);
                          const events = eventsByDate.get(key) || [];

                          const isCurrentMonth =
                            date.getMonth() === currentMonth &&
                            date.getFullYear() === currentYear;

                          const isToday = key === todayKey;
                          const isSelected = key === selectedDateKey;

                          return (
                            <button
                              key={key}
                              onClick={() => setSelectedDate(date)}
                              className={`min-h-[112px] border-b border-r border-slate-100 p-1.5 text-left transition hover:bg-slate-50 sm:p-2 ${
                                isSelected ? "bg-emerald-50/60" : ""
                              }`}
                            >
                              <div className="mb-2 flex justify-end">
                                <span
                                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                                    isToday
                                      ? "bg-emerald-600 font-bold text-white"
                                      : isSelected
                                        ? "bg-emerald-100 font-bold text-emerald-800"
                                        : isCurrentMonth
                                          ? "text-slate-700"
                                          : "text-slate-300"
                                  }`}
                                >
                                  {date.getDate()}
                                </span>
                              </div>

                              <div className="space-y-0.5">
                                {events.slice(0, 3).map((event) =>
                                  renderEventChip(event)
                                )}

                                {events.length > 3 && (
                                  <p className="px-1 text-[10px] font-semibold text-slate-400">
                                    +{events.length - 3} more
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {view === "week" && (
                  <div className="overflow-x-auto">
                    <div className="min-w-[650px]">
                      <div className="grid grid-cols-7 border-b border-slate-100">
                        {weekDays.map((date) => {
                          const key = localDateKey(date);
                          const isToday = key === todayKey;

                          return (
                            <button
                              key={key}
                              onClick={() => {
                                setSelectedDate(date);
                                setView("day");
                              }}
                              className="px-2 py-3 text-center hover:bg-slate-50"
                            >
                              <p className="text-xs text-slate-400">
                                {WEEKDAYS[date.getDay()]}
                              </p>
                              <span
                                className={`mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                                  isToday
                                    ? "bg-emerald-600 text-white"
                                    : "text-[#142d4e]"
                                }`}
                              >
                                {date.getDate()}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-7">
                        {weekDays.map((date) => {
                          const events =
                            eventsByDate.get(localDateKey(date)) || [];

                          return (
                            <div
                              key={localDateKey(date)}
                              className="min-h-[350px] border-r border-slate-100 p-1.5 last:border-r-0"
                            >
                              {events.length === 0 ? (
                                <p className="py-5 text-center text-[10px] text-slate-300">
                                  No events
                                </p>
                              ) : (
                                events.map((event) => renderEventChip(event))
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {view === "day" && (
                  <div>
                    <div className="mb-4 rounded-lg bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-[#142d4e]">
                        {formatLongDate(selectedDate)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {selectedDayEvents.length} scheduled item(s)
                      </p>
                    </div>

                    {selectedDayEvents.length === 0 ? (
                      <div className="py-16 text-center">
                        <div className="mb-3 text-3xl">📅</div>
                        <p className="font-semibold text-[#142d4e]">
                          Nothing scheduled
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          There are no calendar items on this date.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedDayEvents.map((event) =>
                          renderEventCard(event)
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-[#142d4e]">
                  Selected date
                </h2>
                <span className="text-lg">📌</span>
              </div>

              <p className="text-sm font-semibold text-slate-600">
                {formatLongDate(selectedDate)}
              </p>

              <div className="mt-4 space-y-3">
                {selectedDayEvents.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-400">
                    No events for this date.
                  </p>
                ) : (
                  selectedDayEvents.map((event) => renderEventCard(event))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-bold text-[#142d4e]">
                Upcoming events
              </h2>

              {upcomingEvents.length === 0 ? (
                <p className="py-5 text-center text-sm text-slate-400">
                  No upcoming events.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedDate(parseDate(event.date));
                        setSelectedEvent(event);
                      }}
                      className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-slate-50"
                    >
                      <div className="min-w-[48px] rounded-lg bg-slate-50 px-2 py-2 text-center">
                        <p className="text-xs font-bold text-[#142d4e]">
                          {parseDate(event.date).getDate()}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {parseDate(event.date).toLocaleDateString(
                            "en-GB",
                            { month: "short" }
                          )}
                        </p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#142d4e]">
                          {event.title}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {eventTypeLabel(event.type)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-bold text-[#142d4e]">
                Calendar key
              </h2>

              <div className="space-y-3">
                {(
                  [
                    ["meeting", "Meetings"],
                    ["task", "Task deadlines"],
                    ["project", "Project milestones"],
                  ] as [EventType, string][]
                ).map(([type, label]) => {
                  const color = eventColor(type);

                  return (
                    <div
                      key={type}
                      className="flex items-center gap-3"
                    >
                      <span
                        className={`h-3 w-3 rounded-full ${color.dot}`}
                      />
                      <span className="text-xs text-slate-600">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>

        {selectedEvent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Calendar event details"
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      eventColor(selectedEvent.type).background
                    } ${eventColor(selectedEvent.type).text}`}
                  >
                    {eventTypeLabel(selectedEvent.type)}
                  </span>

                  <h2 className="mt-3 text-xl font-bold text-[#142d4e]">
                    {selectedEvent.title}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedEvent(null)}
                  aria-label="Close event details"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Date
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {formatLongDate(parseDate(selectedEvent.date))}
                  </p>
                </div>

                {selectedEvent.type === "meeting" && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Meeting time
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {getEventTimeLabel(selectedEvent)}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Description
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {selectedEvent.description}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 text-sm capitalize text-slate-700">
                    {statusLabel(selectedEvent.status)}
                  </p>
                </div>

                {selectedEvent.type === "task" && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Priority
                    </p>
                    <p className="mt-1 text-sm capitalize text-slate-700">
                      {selectedEvent.priority || "Not specified"}
                    </p>
                  </div>
                )}

                {selectedEvent.type === "project" && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Project progress
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, selectedEvent.progress || 0)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-600">
                        {selectedEvent.progress || 0}%
                      </span>
                    </div>
                  </div>
                )}

                {selectedEvent.departmentId && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Department
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {getDepartmentName(selectedEvent.departmentId)}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-7 flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="rounded-lg bg-[#142d4e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d416c]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}