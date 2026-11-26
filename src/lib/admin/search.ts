export type SearchHit = { id: string; title: string; subtitle: string; href: string };

export type SearchGroup = {
    key: string;
    label: string;
    /** The admin section the records belong to, which gives the group its colour. */
    section: string;
    hits: SearchHit[];
};

/** Shorter text matches too much to be a useful search. */
export const MIN_QUERY = 2;
