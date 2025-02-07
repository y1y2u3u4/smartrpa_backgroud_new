import { User } from "./user";

export interface Music {
  song_name?: string;
  lyric?: string;
  song_url?: string;
}

export interface SunoMusicParams {
  description?: string;
  style?: string;
  instrumental?: boolean;
  song_name?: string;
  lyric?: string;
}

export interface SunoMusic extends SunoMusicParams, Music {
  id?: number;
  user_email: string;
  created_at: string;
  status?: number;
}

export interface SunoMusicType {
  audio_url: string;
  created_at: string;
  id: string;
  image_large_url: string;
  image_url: string;
  title: string;
}




export interface Note {
  note_name?: string;
  note_lyric?: string;
  note_url?: string;
  keyword?: string;
  styles?: string;
}

export interface NoteParams {
  description?: string;
  note_name?: string;
  note_lyric?: string;
}

export interface Notes extends NoteParams, Note {
  id?: number;
  user_email: string;
  created_at: string;
  status?: number;
}



export interface Style {
  style_name?: string;
  style_lyric?: string;
  style_url?: string;
}

export interface StyleParams {
  description?: string;
  style_name?: string;
  style_lyric?: string;
}

export interface Styles extends StyleParams, Style {
  id?: number;
  user_email: string;
  created_at: string;
  status?: number;
}



export interface NoteStyle {
  style_name?: string;
  note_name?: string;
}

export interface NoteStyleParams {
  description?: string;
  style_name?: string;
  note_name?: string;
}

export interface NoteStyles extends NoteStyleParams, NoteStyle {
  id?: number;
  user_email: string;
  created_at: string;
  status?: number;
}
