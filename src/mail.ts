const getOwnerEmailAddress = (): string => {
    return PropertiesService.getScriptProperties().getProperty('EMAIL_ADDRESS');
}

export const sendMail = (body: string, emailAddress?: string): number => {
    try {
        if (!emailAddress) {
            emailAddress = getOwnerEmailAddress();
        }

        MailApp.sendEmail({
            to: emailAddress,
            body: body
        });

        return 200;
    } catch (error) {
        console.error(`Error occured while sending email: ${error}`);

        return 500;
    }
}