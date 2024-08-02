export const serializeArray = (array: any[]) => {
    return JSON.stringify(array);
}

export const deserializeArray = (array: string) => {
    return JSON.parse(array);
}