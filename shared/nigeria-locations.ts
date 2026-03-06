// Nigerian States and LGAs for OriginTrace
// Focus on key agricultural regions for cocoa, cashew, and other exports

export interface NigeriaLocation {
  state: string;
  lgas: string[];
}

export const NIGERIA_LOCATIONS: NigeriaLocation[] = [
  {
    state: "Ondo",
    lgas: ["Akure South", "Akure North", "Idanre", "Ondo West", "Ondo East", "Owo", "Odigbo", "Ile Oluji/Okeigbo", "Irele", "Okitipupa"]
  },
  {
    state: "Cross River",
    lgas: ["Calabar Municipal", "Calabar South", "Ikom", "Etung", "Boki", "Obubra", "Yakurr", "Abi", "Biase", "Akamkpa"]
  },
  {
    state: "Ogun",
    lgas: ["Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Ewekoro", "Ifo", "Ijebu North", "Ijebu Ode", "Ikenne", "Ilaro", "Imeko Afon"]
  },
  {
    state: "Osun",
    lgas: ["Osogbo", "Ife Central", "Ife North", "Ife South", "Ife East", "Ilesha West", "Ilesha East", "Iwo", "Ejigbo", "Ede North"]
  },
  {
    state: "Oyo",
    lgas: ["Ibadan North", "Ibadan South-West", "Ibadan South-East", "Ibadan North-East", "Ibadan North-West", "Akinyele", "Egbeda", "Ido", "Lagelu", "Oluyole"]
  },
  {
    state: "Edo",
    lgas: ["Benin City", "Oredo", "Egor", "Ikpoba-Okha", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Akoko-Edo", "Etsako West"]
  },
  {
    state: "Ekiti",
    lgas: ["Ado Ekiti", "Ikere", "Oye", "Ikole", "Emure", "Ise/Orun", "Ijero", "Efon", "Ekiti West", "Ekiti East"]
  },
  {
    state: "Abia",
    lgas: ["Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiala Ngwa North", "Isiala Ngwa South", "Isuikwuato", "Obi Ngwa", "Ohafia"]
  },
  {
    state: "Kwara",
    lgas: ["Ilorin West", "Ilorin East", "Ilorin South", "Asa", "Moro", "Offa", "Oyun", "Ifelodun", "Irepodun", "Ekiti (Kwara)"]
  },
  {
    state: "Kogi",
    lgas: ["Lokoja", "Okene", "Kabba/Bunu", "Ijumu", "Yagba West", "Yagba East", "Mopa-Muro", "Ofu", "Idah", "Ankpa"]
  }
];

// Common communities by state (simplified for demo)
export const COMMUNITIES: Record<string, string[]> = {
  "Ondo": ["Aponmu", "Ipogun", "Owena", "Idoani", "Alade", "Uso", "Isua", "Ifon", "Ore", "Ofosu"],
  "Cross River": ["Boje", "Ikom", "Ogoja", "Obudu", "Calabar", "Akamkpa", "Abi", "Obubra", "Ugep", "Ikom"],
  "Ogun": ["Ijebu-Ode", "Ago-Iwoye", "Ilishan", "Ikenne", "Sagamu", "Ijebu-Igbo", "Atan", "Ota", "Abeokuta", "Ewekoro"],
  "Osun": ["Ile-Ife", "Ilesa", "Oshogbo", "Ede", "Iwo", "Ejigbo", "Gbongan", "Ikire", "Apomu", "Ila"],
  "Oyo": ["Ibadan", "Oyo", "Ogbomoso", "Iseyin", "Saki", "Eruwa", "Igboho", "Kisi", "Igbo-Ora", "Lanlate"],
  "Edo": ["Benin City", "Ekpoma", "Auchi", "Uromi", "Irrua", "Ubiaja", "Igarra", "Afuze", "Sabongida-Ora", "Fugar"],
  "Ekiti": ["Ado-Ekiti", "Ikere", "Ijero", "Efon", "Aramoko", "Ikole", "Oye", "Emure", "Ise", "Omuo"],
  "Abia": ["Aba", "Umuahia", "Ohafia", "Arochukwu", "Bende", "Isiala-Ngwa", "Obingwa", "Osisioma", "Ukwa", "Isuikwuato"],
  "Kwara": ["Ilorin", "Offa", "Omu-Aran", "Patigi", "Lafiagi", "Jebba", "Kaiama", "Baruten", "Edu", "Moro"],
  "Kogi": ["Lokoja", "Okene", "Kabba", "Idah", "Ankpa", "Dekina", "Ajaokuta", "Koton-Karfe", "Ogori", "Ofu"]
};
