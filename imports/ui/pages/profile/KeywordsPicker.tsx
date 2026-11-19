import React, { useEffect, useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import makeAnimated from 'react-select/animated';

import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import { cocosoReactSelectAdapter } from '/imports/ui/utils/globalStylesManager';

const animatedComponents = makeAnimated();

export interface Keyword {
  _id: string;
  label: string;
}

interface KeywordsPickerProps {
  value: Keyword[];
  onChange: (keywords: Keyword[]) => void;
}

// The keywords on a profile, chosen among everyone's or written anew. The
// profile form saves the choice; a new keyword is added to the shared list
// at once.
export default function KeywordsPicker({
  value,
  onChange,
}: KeywordsPickerProps) {
  const [allKeywords, setAllKeywords] = useState<Keyword[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    call<Keyword[]>('getKeywords')
      .then((keywords) => setAllKeywords(keywords || []))
      .catch((error: any) => message.error(error.reason || error.error));
  }, []);

  const createKeyword = async (label: string) => {
    setCreating(true);
    try {
      const _id = await call<string>('createKeyword', label);
      const keyword = { _id, label: label.toLowerCase() };
      setAllKeywords((keywords) => [...keywords, keyword]);
      onChange([...value, keyword]);
    } catch (error: any) {
      message.error(error.reason || error.error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <CreatableSelect
      components={animatedComponents}
      isClearable
      isLoading={creating}
      isMulti
      menuPlacement="auto"
      options={allKeywords}
      placeholder=""
      styles={{
        control: cocosoReactSelectAdapter,
      }}
      value={value}
      getOptionValue={(option: Keyword) => option._id}
      onChange={(keywords) => onChange([...(keywords as Keyword[])])}
      onCreateOption={createKeyword}
    />
  );
}
