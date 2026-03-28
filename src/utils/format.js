export const formatValidationErrors = (errors) => {
    if(!errors || !errors.issues) return 'Validation failed';

    if(Array.isArray(errors.issues)) {
        return errors.issues
            .map(issue => {
                const field = issue.path.join('.');
                return `${field}: ${issue.message}`;
            })
            .join('; ');
    }

    return JSON.stringify(errors);
}