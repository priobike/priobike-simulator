function createPopupMessage(id, html)
{
    const newMessage = document.createElement('li');
    newMessage.className = 'message';
    newMessage.id = id;
    newMessage.innerHTML = html;
    document.getElementById("messages").appendChild(newMessage);
}

function removeMessage(id)
{
    document.getElementById(id).remove();
}

function removeAllMessages()
{
    document.getElementById('messages').replaceChildren();
}