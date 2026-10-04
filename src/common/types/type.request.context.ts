export interface AuthenticatedUser {
  username: string;
  nama: string;
  id_actor: string;
  nama_actor: string;
  jenis_actor: string;
  nama_pekerjaan: string;
  jabatan: string | null;
}

export interface RequestContext {
  headers: {
    authorization?: string | string[];
  };
  user?: AuthenticatedUser;
}
