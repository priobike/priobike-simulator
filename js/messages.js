function createPopupMessage(id, html)
{
    const messageContainer = document.getElementById("messages")
    // maximal 4 pairrequests gleichzeitig
    if(messageContainer.getElementsByTagName('li').length == 4) {
        messageContainer.removeChild(messageContainer.lastChild);
    }

    const newMessage = document.createElement('li');
    newMessage.className = 'message';
    newMessage.id = id;
    newMessage.innerHTML = html;
    messageContainer.prepend(newMessage);
}

function removeMessage(id)
{
    document.getElementById(id).remove();
}

function removeAllMessages()
{
    document.getElementById('messages').replaceChildren();
}


function expand(){
    const messageContainer = document.getElementById("messages")
    messageContainer.classList.toggle("stacked")
}