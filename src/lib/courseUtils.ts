interface SubCourse {
  id: string;
  name: string;
  start_hole: number;
  end_hole: number;
  sequence?: number;
}

interface HoleMapping {
  globalHole: number;
  displayHole: number;
  subCourseId: string;
}

/**
 * Converts a global hole number to a display hole number based on sub-course configuration
 * @param globalHoleNumber - The actual hole number in the database (e.g., 10)
 * @param subCourses - Array of sub-courses in sequence order
 * @returns The display hole number (e.g., 1 if it's the first hole in the configuration)
 */
export function getDisplayHoleNumber(
  globalHoleNumber: number,
  subCourses: SubCourse[]
): number {
  const mapping = createHoleNumberMapping(subCourses);
  const found = mapping.find(m => m.globalHole === globalHoleNumber);
  return found?.displayHole || globalHoleNumber;
}

/**
 * Creates a complete mapping between global hole numbers and display hole numbers
 * @param subCourses - Array of sub-courses in sequence order
 * @returns Array of hole mappings
 */
export function createHoleNumberMapping(
  subCourses: SubCourse[]
): HoleMapping[] {
  const mapping: HoleMapping[] = [];
  let displayCounter = 1;

  // Sort by sequence if available, otherwise use array order
  const sortedSubCourses = [...subCourses].sort((a, b) => 
    (a.sequence || 0) - (b.sequence || 0)
  );

  for (const subCourse of sortedSubCourses) {
    const holeCount = subCourse.end_hole - subCourse.start_hole + 1;
    
    for (let i = 0; i < holeCount; i++) {
      mapping.push({
        globalHole: subCourse.start_hole + i,
        displayHole: displayCounter++,
        subCourseId: subCourse.id,
      });
    }
  }

  return mapping;
}

/**
 * Converts a display hole number back to a global hole number
 * @param displayHoleNumber - The display hole number (e.g., 1)
 * @param subCourses - Array of sub-courses in sequence order
 * @returns The global hole number (e.g., 10)
 */
export function getGlobalHoleNumber(
  displayHoleNumber: number,
  subCourses: SubCourse[]
): number {
  const mapping = createHoleNumberMapping(subCourses);
  const found = mapping.find(m => m.displayHole === displayHoleNumber);
  return found?.globalHole || displayHoleNumber;
}

/**
 * Gets the list of available starting holes for a configuration
 * @param configuration - The course configuration with sub-courses
 * @returns Array of display hole numbers that can be used as starting holes
 */
export function getAvailableStartingHoles(
  configuration: any
): number[] {
  if (!configuration?.configuration_sub_courses?.length) {
    return Array.from({ length: 18 }, (_, i) => i + 1);
  }

  const subCourses = configuration.configuration_sub_courses
    .map((cs: any) => cs.sub_courses)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const seqA = configuration.configuration_sub_courses.find(
        (cs: any) => cs.sub_courses?.id === a.id
      )?.sequence || 0;
      const seqB = configuration.configuration_sub_courses.find(
        (cs: any) => cs.sub_courses?.id === b.id
      )?.sequence || 0;
      return seqA - seqB;
    });

  const mapping = createHoleNumberMapping(subCourses);
  return mapping.map(m => m.displayHole);
}

/**
 * Gets the display hole range for a sub-course within a configuration
 * @param subCourse - The sub-course to get the display range for
 * @param allSubCourses - All sub-courses in the configuration in sequence order
 * @returns Object with start and end display hole numbers
 */
export function getSubCourseDisplayRange(
  subCourse: SubCourse,
  allSubCourses: SubCourse[]
): { start: number; end: number } {
  const mapping = createHoleNumberMapping(allSubCourses);
  const subCourseHoles = mapping.filter(m => m.subCourseId === subCourse.id);
  
  if (subCourseHoles.length === 0) {
    return { start: 1, end: 1 };
  }

  return {
    start: Math.min(...subCourseHoles.map(h => h.displayHole)),
    end: Math.max(...subCourseHoles.map(h => h.displayHole)),
  };
}

/**
 * Validates that hole ranges in sub-courses don't overlap
 * @param subCourses - Array of sub-courses to validate
 * @returns true if valid, error message if invalid
 */
export function validateHoleRanges(
  subCourses: SubCourse[]
): { valid: boolean; error?: string } {
  const usedHoles = new Set<number>();

  for (const subCourse of subCourses) {
    for (let hole = subCourse.start_hole; hole <= subCourse.end_hole; hole++) {
      if (usedHoles.has(hole)) {
        return {
          valid: false,
          error: `Hole ${hole} is used in multiple sub-courses`,
        };
      }
      usedHoles.add(hole);
    }
  }

  return { valid: true };
}

/**
 * Calculates the score relative to par (VS Par)
 * @param score - The player's total score
 * @param par - The course par
 * @returns Formatted string like "+5", "E", "-3"
 */
export function calculateVsPar(score: number, par: number): string {
  const diff = score - par;
  
  if (diff === 0) return "E"; // Even par
  if (diff > 0) return `+${diff}`; // Over par
  return `${diff}`; // Under par (negative sign already included)
}

/**
 * Gets the numeric difference from par
 * @param score - The player's total score
 * @param par - The course par
 * @returns Numeric difference (positive = over par, negative = under par)
 */
export function getVsParValue(score: number, par: number): number {
  return score - par;
}

/**
 * Gets the score type for a hole (Eagle, Birdie, Par, Bogey, etc.)
 * @param strokes - Number of strokes taken
 * @param par - Par for the hole
 * @returns Score type string
 */
export function getHoleScoreType(strokes: number, par: number): string {
  const diff = strokes - par;
  
  if (diff <= -3) return "Albatross";
  if (diff === -2) return "Eagle";
  if (diff === -1) return "Birdie";
  if (diff === 0) return "Par";
  if (diff === 1) return "Bogey";
  if (diff === 2) return "Double Bogey";
  if (diff === 3) return "Triple Bogey";
  return `+${diff}`;
}

/**
 * Gets the color class for a score type
 * @param strokes - Number of strokes taken
 * @param par - Par for the hole
 * @returns Tailwind color class
 */
export function getScoreColor(strokes: number, par: number): string {
  const diff = strokes - par;
  
  if (diff <= -2) return "text-yellow-500 font-bold"; // Eagle or better
  if (diff === -1) return "text-green-500 font-bold"; // Birdie
  if (diff === 0) return "text-foreground"; // Par
  if (diff === 1) return "text-orange-500"; // Bogey
  if (diff === 2) return "text-red-400"; // Double Bogey
  return "text-red-500"; // Triple Bogey or worse
}

/**
 * Filters holes to only include those that are part of configured sub-courses
 * @param holes - All holes from the database
 * @param configurations - Course configurations with sub-courses
 * @returns Filtered array of holes that belong to configured sub-courses
 */
export function filterHolesBySubCourses(
  holes: any[],
  configurations: any[]
): any[] {
  if (!configurations || configurations.length === 0) {
    return holes;
  }

  // Get all unique hole numbers from all sub-courses across all configurations
  const validHoleNumbers = new Set<number>();

  configurations.forEach(config => {
    if (config.configuration_sub_courses) {
      config.configuration_sub_courses.forEach((cs: any) => {
        if (cs.sub_courses) {
          const { start_hole, end_hole } = cs.sub_courses;
          for (let holeNum = start_hole; holeNum <= end_hole; holeNum++) {
            validHoleNumbers.add(holeNum);
          }
        }
      });
    }
  });

  // Filter holes to only include those in the valid set
  return holes.filter(hole => validHoleNumbers.has(hole.hole_number));
}
