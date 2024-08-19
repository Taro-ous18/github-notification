export const getOwnerEmailAddress = (): string => {
    return PropertiesService.getScriptProperties().getProperty('EMAIL_ADDRESS');
}

export const sendMail = (subject, body, emailAddress): number => {
    try {
        MailApp.sendEmail({
            to: emailAddress,
            subject: subject,
            body: body,
        });

        return 200;
    } catch (error) {
        console.error(`Error occured while sending email: ${error}`);

        return 500;
    }
}