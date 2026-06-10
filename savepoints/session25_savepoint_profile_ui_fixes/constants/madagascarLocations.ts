import { ANTANANARIVO_LOCATIONS } from './locations/antananarivo';
import { FIANARANTSOA_LOCATIONS } from './locations/fianarantsoa';
import { TOAMASINA_LOCATIONS } from './locations/toamasina';
import { MAHAJANGA_LOCATIONS } from './locations/mahajanga';
import { ANTSIRANANA_LOCATIONS } from './locations/antsiranana';
import { TOLIARA_LOCATIONS } from './locations/toliara';
import { ROUTES_NATIONALES } from './locations/routesNationales';

export const MADAGASCAR_LOCATIONS: string[] = [
  ...ANTANANARIVO_LOCATIONS,
  ...FIANARANTSOA_LOCATIONS,
  ...TOAMASINA_LOCATIONS,
  ...MAHAJANGA_LOCATIONS,
  ...ANTSIRANANA_LOCATIONS,
  ...TOLIARA_LOCATIONS,
];
