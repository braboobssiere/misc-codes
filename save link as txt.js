javascript:(function() {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const formattedTime = currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '-');
    const fileName = `links ${formattedDate} ${formattedTime}.txt`;

    const sourceUrl = `Source URL: ${document.location.href}`;
    
    const links = Array.from(document.querySelectorAll('a')).map(link => `${link.textContent.trim()}\n${link.href}`);
    const linkTextAndAddress = links.join('\n\n');
    
    const content = `${sourceUrl}\n\n${linkTextAndAddress}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
})();
