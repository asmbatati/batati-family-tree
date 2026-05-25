"use client";

import { useMemo } from "react";
import type { Person, Relationship } from "@/lib/types";
import { RELATIONSHIP_STYLE } from "@/lib/types";
import { CloseIcon, PlusIcon, getRelationshipIcon } from "@/components/icons";

type Props = {
  person: Person;
  people: Person[];
  relationships: Relationship[];
  locale: "ar" | "en";
  dict: {
    profile: string;
    born: string;
    died: string;
    location: string;
    occupation: string;
    bio: string;
    relationships: string;
    addRelative: string;
    edit: string;
    close: string;
  };
  relationLabels: Record<string, string>;
  onClose: () => void;
  onSelect: (id: string) => void;
  onAddRelative: (type: string) => void;
};

const ADD_OPTIONS = [
  "father", "mother", "son", "daughter",
  "brother", "sister", "spouse", "milk",
  "uncleP", "uncleM", "auntP", "auntM"
];

export default function PersonProfile({
  person, people, relationships, locale, dict, relationLabels, onClose, onSelect, onAddRelative
}: Props) {
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // Build list of this person's relationships (incoming + outgoing)
  const personRels = useMemo(() => {
    return relationships
      .filter((r) => r.fromId === person.id || r.toId === person.id)
      .map((r) => {
        const isFrom = r.fromId === person.id;
        const otherId = isFrom ? r.toId : r.fromId;
        const other = peopleById.get(otherId);
        return { r, other, isFrom };
      })
      .filter((x) => x.other);
  }, [relationships, person, peopleById]);

  const name = locale === "ar" ? person.nameAr : (person.nameEn || person.nameAr);
  const family = locale === "ar" ? person.familyAr : (person.familyEn || person.familyAr);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="relative w-full max-w-xl rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 end-3 rounded-full p-1.5 text-sand-600 hover:bg-sand-100"
          aria-label={dict.close}
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={"grid h-14 w-14 place-items-center rounded-full text-white font-display text-xl " + (person.gender === "male" ? "bg-gradient-to-br from-sand-500 to-sand-700" : "bg-gradient-to-br from-rose-400 to-rose-600")}>
            {name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl text-sand-900">{name}</h2>
            <div className="text-sm text-sand-600">
              {family ? family : ""}
              {person.generation !== undefined && (
                <span className="ms-2 inline-flex rounded-full bg-sand-100 px-2 py-0.5 text-[11px] text-sand-700">
                  G{person.generation}
                </span>
              )}
            </div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {person.birthYear && (
            <div>
              <dt className="text-xs text-sand-600">{dict.born}</dt>
              <dd className="text-sand-900">{person.birthYear}</dd>
            </div>
          )}
          {person.deathYear && (
            <div>
              <dt className="text-xs text-sand-600">{dict.died}</dt>
              <dd className="text-sand-900">{person.deathYear}</dd>
            </div>
          )}
          {person.location && (
            <div>
              <dt className="text-xs text-sand-600">{dict.location}</dt>
              <dd className="text-sand-900">{person.location}</dd>
            </div>
          )}
          {(person.occupationAr || person.occupationEn) && (
            <div>
              <dt className="text-xs text-sand-600">{dict.occupation}</dt>
              <dd className="text-sand-900">
                {locale === "ar" ? person.occupationAr : (person.occupationEn || person.occupationAr)}
              </dd>
            </div>
          )}
        </dl>

        {(person.bioAr || person.bioEn) && (
          <div className="mt-4 rounded-xl bg-sand-50 p-3 text-sm text-sand-800">
            <div className="mb-1 text-xs font-medium text-sand-600">{dict.bio}</div>
            <p>{locale === "ar" ? person.bioAr : (person.bioEn || person.bioAr)}</p>
          </div>
        )}

        {/* Relationships list */}
        <div className="mt-5">
          <h3 className="text-sm font-medium text-sand-700">{dict.relationships} ({personRels.length})</h3>
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pe-1">
            {personRels.map(({ r, other }) => {
              const style = RELATIONSHIP_STYLE[r.type];
              const otherName = locale === "ar" ? other!.nameAr : (other!.nameEn || other!.nameAr);
              return (
                <li key={r.id} className="flex items-center gap-2 rounded-lg border border-sand-100 bg-white px-3 py-1.5 text-sm">
                  <span
                    aria-hidden
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ color: style.color, backgroundColor: style.color + "22" }}
                  >
                    {getRelationshipIcon(style.icon, "h-3.5 w-3.5")}
                  </span>
                  <span className="text-sand-600 text-xs">{relationLabels[r.type] ?? r.type}</span>
                  <button
                    onClick={() => onSelect(other!.id)}
                    className="ms-auto rounded-full px-2 py-0.5 text-sand-900 hover:bg-sand-100"
                  >
                    {otherName} →
                  </button>
                </li>
              );
            })}
            {personRels.length === 0 && (
              <li className="text-xs text-sand-500">—</li>
            )}
          </ul>
        </div>

        {/* Add-relative quick buttons */}
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-sand-700">
            <PlusIcon className="h-4 w-4" /> {dict.addRelative}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ADD_OPTIONS.map((k) => (
              <button
                key={k}
                onClick={() => onAddRelative(k)}
                className="inline-flex items-center gap-1 rounded-full border border-sand-200 bg-white px-2.5 py-1 text-xs text-sand-700 hover:bg-sand-50"
              >
                <PlusIcon className="h-3 w-3" />
                {relationLabels[k] ?? k}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
