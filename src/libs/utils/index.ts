/**
 * Flattens multiline text by trimming lines and joining them with "\\n".
 *
 * @param text The multiline text to flatten.
 * @returns The flattened text.
 */
export function flattenMultilineText(text: string): string {
    return text
        .split("\n")
        .map((line: string): string => line.trim())
        .filter((line: string): boolean => line.length > 0)
        .join("\\n");
}
