"use client"

import { useEffect, useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface JiraProject {
    id: string;
    key: string;
    name: string;
}

export function JiraImportFormDialog({
                                         boardId,
                                         isOpen,
                                         onClose,
                                     }: {
    boardId: string
    isOpen: boolean
    onClose: () => void
}) {
    const [isConnected, setIsConnected] = useState(false)
    const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([])
    const [selectedJiraProjectId, setSelectedJiraProjectId] = useState<string | undefined>(undefined)
    const [isLoadingProjects, setIsLoadingProjects] = useState(false)
    const [projectFetchError, setProjectFetchError] = useState<string | null>(null)
    const [isImporting, setIsImporting] = useState(false)

    const checkConnectionStatus = useCallback(() => {
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        const urlParams = new URLSearchParams(window.location.search);
        let currentlyConnected = urlParams.get("jira") === "connected";

        if (currentlyConnected) {
            localStorage.setItem('jiraLastAuthTimestamp', Date.now().toString());
            const newParams = new URLSearchParams(window.location.search);
            if (newParams.has("jira")) {
                newParams.delete("jira");
                const newSearch = newParams.toString();
                window.history.replaceState({}, '', `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`);
            }
        } else {
            const storedTimestamp = localStorage.getItem('jiraLastAuthTimestamp');
            if (storedTimestamp) {
                const timestamp = parseInt(storedTimestamp, 10);
                if (Date.now() - timestamp < TWO_HOURS_MS) {
                    currentlyConnected = true;
                } else {
                    localStorage.removeItem('jiraLastAuthTimestamp');
                }
            }
        }
        return currentlyConnected;
    }, []);

    const fetchJiraProjects = useCallback(async () => {
        setIsLoadingProjects(true);
        setProjectFetchError(null);
        setJiraProjects([]);
        setSelectedJiraProjectId(undefined);

        try {
            const response = await fetch('/jira/projects/list');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch projects from Jira.' }));
                if (response.status === 401) {
                    setProjectFetchError(errorData.message || 'Jira connection invalid or expired. Please log in with Jira.');
                    setIsConnected(false);
                    localStorage.removeItem('jiraLastAuthTimestamp');
                } else {
                    setProjectFetchError(errorData.message || `Error fetching projects: ${response.statusText}`);
                }
                setIsLoadingProjects(false);
                return;
            }
            const projectsData: JiraProject[] = await response.json();
            setJiraProjects(projectsData);
            setIsConnected(true);
        } catch (error) {
            console.error("Error fetching Jira projects:", error);
            setProjectFetchError("An unexpected error occurred while fetching projects.");
            setIsConnected(false);
        }
        setIsLoadingProjects(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const connectedStatus = checkConnectionStatus();
            setIsConnected(connectedStatus);
            if (connectedStatus) {
                fetchJiraProjects();
            } else {
                setJiraProjects([]);
                setSelectedJiraProjectId(undefined);
                setProjectFetchError(null);
                setIsLoadingProjects(false);
            }
        }
    }, [isOpen, checkConnectionStatus, fetchJiraProjects]);

    const handleAuthClick = () => {
        const clientId = import.meta.env.VITE_JIRA_CLIENT_ID;
        const redirectUri = encodeURIComponent(import.meta.env.VITE_APP_URL + "/oauth/jira/callback");
        const scope = encodeURIComponent("read:me read:account read:jira-user read:jira-work read:project:jira");

        const statePayload = { boardId: boardId };
        const boardEncodedState = encodeURIComponent(btoa(JSON.stringify(statePayload)));

        window.location.href =
            `https://auth.atlassian.com/authorize` +
            `?audience=api.atlassian.com` +
            `&client_id=${clientId}` +
            `&scope=${scope}` +
            `&redirect_uri=${redirectUri}` +
            `&state=${boardEncodedState}` +
            `&response_type=code` +
            `&prompt=consent`;
    }

    const handleImportClick = async () => {
        if (!selectedJiraProjectId) {
            setProjectFetchError("Please select a Jira project to import from.");
            return;
        }
        setIsImporting(true);
        setProjectFetchError(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const response = await fetch('/jira/import/tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    appBoardId: boardId,
                    jiraProjectId: selectedJiraProjectId
                })
            });

            const responseData = await response.json().catch(() => ({ message: 'An unexpected error occurred during import.' }));

            if (!response.ok) {
                if (response.status === 401) {
                    setProjectFetchError(responseData.message || 'Jira connection invalid or expired. Please log in again.');
                    setIsConnected(false);
                    localStorage.removeItem('jiraLastAuthTimestamp');
                } else {
                    setProjectFetchError(responseData.message || `Error during import: ${response.statusText}`);
                }
            } else {
                alert(responseData.message || "Import process initiated successfully!");
                onClose();
            }
        } catch (error) {
            console.error("Error initiating Jira import:", error);
            setProjectFetchError("An unexpected network error occurred while initiating the import.");
        }
        setIsImporting(false);
    };

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            setSelectedJiraProjectId(undefined);
            setProjectFetchError(null);
        }
        onClose();
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleDialogClose}>
            <DialogContent className="max-w-xl bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-200 border border-white/10 sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="text-zinc-100 text-lg">Jira Import</DialogTitle>
                </DialogHeader>

                {!isConnected ? (
                    <Button
                        onClick={handleAuthClick}
                        className="w-full h-10 mt-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        Log in with Jira
                    </Button>
                ) : (
                    <>
                        <div className="mt-3 inline-flex items-center gap-2 text-sm text-green-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            Connected to Jira
                        </div>

                        {isLoadingProjects ? (
                            <div className="mt-4 flex items-center justify-center text-zinc-400">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin text-zinc-400" />
                                Loading Jira projects...
                            </div>
                        ) : projectFetchError ? (
                            <div className="mt-4 p-3 bg-red-900/20 border border-red-700/40 rounded-md">
                                <p className="text-sm text-red-400">{projectFetchError}</p>
                                {(projectFetchError.includes("log in with Jira") || projectFetchError.includes("expired")) && (
                                    <Button
                                        variant="link"
                                        className="p-0 h-auto text-indigo-400 hover:text-indigo-300 mt-1 text-sm"
                                        onClick={handleAuthClick}
                                    >
                                        {projectFetchError.includes("expired") ? "Reconnect with Jira" : "Log in with Jira again"}
                                    </Button>
                                )}
                            </div>
                        ) : jiraProjects.length > 0 ? (
                            <div className="mt-4 space-y-3">
                                <Select
                                    value={selectedJiraProjectId}
                                    onValueChange={(value) => {
                                        setSelectedJiraProjectId(value);
                                        setProjectFetchError(null);
                                    }}
                                >
                                    <SelectTrigger
                                        className="relative flex h-10 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-white/40 placeholder:text-zinc-400"
                                    >
                                        <SelectValue placeholder="Select a Jira project to import from" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-md">
                                        {jiraProjects.map((project) => (
                                            <SelectItem
                                                key={project.id}
                                                value={project.id}
                                                className="hover:bg-zinc-700 data-[highlighted]:bg-zinc-700 data-[state=checked]:bg-zinc-600 cursor-pointer text-sm"
                                            >
                                                {project.name} ({project.key})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={handleImportClick}
                                    disabled={!selectedJiraProjectId || isImporting}
                                    className="w-full h-10 px-3 py-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Import Tickets from Jira
                                </Button>
                            </div>
                        ) : (
                            <p className="mt-4 text-zinc-400 text-sm">No Jira projects found. This could be because you don't have access to any projects, or the necessary permissions are missing for the integration.</p>
                        )}
                    </>
                )}
                <p className="mt-4 text-zinc-400 text-sm">
                    Disclaimer: Your Jira token is stored securely in session memory only. It is automatically removed after 120
                    minutes of inactivity.
                </p>
            </DialogContent>
        </Dialog>
    )
}