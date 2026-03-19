import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Music, Play, Pause, Plus, ExternalLink, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface TrackItem {
  track_name: string;
  artist_name: string;
  album_name: string;
  album_art_url: string | null;
  track_uri: string;
  duration_ms: number;
  preview_url: string | null;
  added_by_name: string | null;
}

interface PlaylistTabProps {
  tripId: string;
  trip: {
    destination: string;
    trip_type: string | null;
    start_date: string;
  };
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const PlaylistTab = ({ tripId, trip }: PlaylistTabProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [playlistName, setPlaylistName] = useState(
    `${trip.destination} ✈ ${new Date(trip.start_date).getFullYear()}`
  );
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TrackItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingTrack, setAddingTrack] = useState<string>("");
  const [playingPreview, setPlayingPreview] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: spotifyConn } = useQuery({
    queryKey: ["spotify-connection", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("spotify_connections")
        .select("spotify_user_id, spotify_display_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: playlistData, refetch: refetchPlaylist, error: playlistError } = useQuery({
    queryKey: ["trip-playlist", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-playlist-tracks", {
        body: { trip_id: tripId },
      });
      if (error) throw error;
      return data as {
        tracks: TrackItem[];
        playlist: { name: string; url: string; embed_url: string } | null;
        message?: string;
      };
    },
  });

  useEffect(() => {
    if (playlistError) toast({ title: "Could not load playlist", description: "Please try again later.", variant: "destructive" });
  }, [playlistError]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const createPlaylist = async () => {
    if (!playlistName.trim()) return;
    setCreatingPlaylist(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-trip-playlist", {
        body: { trip_id: tripId, playlist_name: playlistName.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Playlist created!", description: data.playlist_name });
      refetchPlaylist();
    } catch (err) {
      toast({
        title: "Failed to create playlist",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const searchTracks = (query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("search-spotify-tracks", {
          body: { query: query.trim(), trip_id: tripId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        toast({
          title: "Search failed",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const addTrack = async (track: TrackItem) => {
    setAddingTrack(track.track_uri);
    try {
      const { data, error } = await supabase.functions.invoke("add-to-playlist", {
        body: { trip_id: tripId, track_uri: track.track_uri },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `Added "${track.track_name}"` });
      setSearchResults([]);
      setSearchQuery("");
      refetchPlaylist();
    } catch (err) {
      toast({
        title: "Failed to add track",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setAddingTrack("");
    }
  };

  const togglePreview = (track: TrackItem) => {
    if (!track.preview_url) return;

    if (playingPreview === track.track_uri) {
      audioRef.current?.pause();
      setPlayingPreview("");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(track.preview_url);
    audioRef.current = audio;
    audio.play();
    setPlayingPreview(track.track_uri);
    audio.onended = () => setPlayingPreview("");
  };

  // Not connected to Spotify
  if (!spotifyConn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Music size={28} className="text-primary" />
        </div>
        <h3 className="text-lg font-heading mb-2">Connect Spotify to start your trip soundtrack</h3>
        <p className="text-sm text-muted-foreground font-body mb-6 max-w-xs">
          Create collaborative playlists with your travel crew. Everyone can add songs.
        </p>
        <Button variant="champagne" onClick={() => navigate("/settings#music")}>
          Go to Settings
        </Button>
      </div>
    );
  }

  // Connected but no playlist yet
  if (!playlistData?.playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Music size={28} className="text-primary" />
        </div>
        <h3 className="text-lg font-heading mb-2">Every great trip deserves a soundtrack</h3>
        <p className="text-sm text-muted-foreground font-body mb-6 max-w-xs">
          All collaborators can add songs once the playlist is created.
        </p>
        <div className="w-full max-w-xs space-y-3">
          <Input
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="Playlist name"
            className="bg-secondary border-border h-11 font-body text-center"
          />
          <Button
            variant="champagne"
            className="w-full"
            onClick={createPlaylist}
            disabled={creatingPlaylist || !playlistName.trim()}
          >
            {creatingPlaylist ? (
              <><Loader2 size={14} className="animate-spin mr-2" /> Creating…</>
            ) : (
              <><Music size={14} className="mr-2" /> Create Playlist</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const playlist = playlistData.playlist;
  const tracks = playlistData.tracks ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading">{playlist.name}</h2>
          <p className="text-xs text-muted-foreground font-body">{tracks.length} track{tracks.length !== 1 ? "s" : ""}</p>
        </div>
        <a
          href={playlist.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-body text-[#1DB954] hover:underline"
        >
          Open in Spotify <ExternalLink size={12} />
        </a>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => searchTracks(e.target.value)}
          placeholder="Search songs to add…"
          className="bg-secondary border-border h-11 font-body pl-9"
        />
        {searching && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="glass rounded-xl overflow-hidden divide-y divide-border">
          {searchResults.map((track) => (
            <div key={track.track_uri} className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors">
              {track.album_art_url ? (
                <button
                  onClick={() => togglePreview(track)}
                  className="relative flex-shrink-0 w-10 h-10 rounded overflow-hidden group"
                  aria-label={playingPreview === track.track_uri ? "Pause preview" : "Play preview"}
                >
                  <img src={track.album_art_url} alt={track.album_name} className="w-full h-full object-cover" />
                  {track.preview_url && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      {playingPreview === track.track_uri ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white" />}
                    </div>
                  )}
                </button>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 rounded bg-secondary flex items-center justify-center">
                  <Music size={14} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body text-foreground truncate">{track.track_name}</p>
                <p className="text-xs text-muted-foreground font-body truncate">{track.artist_name} · {formatDuration(track.duration_ms)}</p>
              </div>
              <button
                onClick={() => addTrack(track)}
                disabled={addingTrack === track.track_uri}
                className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                aria-label="Add to playlist"
              >
                {addingTrack === track.track_uri ? (
                  <Loader2 size={12} className="animate-spin text-primary" />
                ) : (
                  <Plus size={12} className="text-primary" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Track list */}
      {tracks.length > 0 && (
        <div className="space-y-1">
          <p className="eyebrow text-muted-foreground mb-3">Playlist</p>
          <div className="glass rounded-xl overflow-hidden divide-y divide-border">
            {tracks.map((track, idx) => (
              <div key={`${track.track_uri}-${idx}`} className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors">
                {track.album_art_url ? (
                  <button
                    onClick={() => togglePreview(track)}
                    className="relative flex-shrink-0 w-10 h-10 rounded overflow-hidden group"
                    aria-label={playingPreview === track.track_uri ? "Pause preview" : "Play preview"}
                  >
                    <img src={track.album_art_url} alt={track.album_name} className="w-full h-full object-cover" />
                    {track.preview_url && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        {playingPreview === track.track_uri ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white" />}
                      </div>
                    )}
                    {playingPreview === track.track_uri && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Pause size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                ) : (
                  <div className="flex-shrink-0 w-10 h-10 rounded bg-secondary flex items-center justify-center">
                    <Music size={14} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-foreground truncate">{track.track_name}</p>
                  <p className="text-xs text-muted-foreground font-body truncate">
                    {track.artist_name} · {formatDuration(track.duration_ms)}
                    {track.added_by_name && <span className="ml-1.5 opacity-60">added by {track.added_by_name}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tracks.length === 0 && !searchQuery && (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground font-body">No tracks yet — search for songs to add.</p>
        </div>
      )}

      {/* Spotify embed */}
      {playlist.embed_url && (
        <div className="rounded-xl overflow-hidden">
          <iframe
            src={playlist.embed_url}
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ border: "none" }}
            title="Spotify playlist"
          />
        </div>
      )}
    </div>
  );
};

export default PlaylistTab;
