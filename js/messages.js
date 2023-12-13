function createPopupMessage(id, html) {
    const messageContainer = document.getElementById("messages")
    // maximal 4 pairrequests gleichzeitig
    if(messageContainer.getElementsByTagName('li').length == 4) {
        messageContainer.removeChild(messageContainer.lastChild);
    }

    const newMessage = document.createElement('li');
    newMessage.className = 'message';
    newMessage.id = id;
    newMessage.innerHTML = html;
    newMessage.onclick = function () { expand(); };
    messageContainer.prepend(newMessage);

    document.getElementById("empty-message").style.display = "none";
}

function removeMessage(id) {
    // TODO nur die neusten 3 nachrichten?
    document.getElementById(id).remove();

    if(document.getElementsByClassName("message").length == 0){
        document.getElementById("empty-message").style.display = "flex";
    }
}

function removeAllMessages() {
    const elements = document.getElementsByClassName("message");
    while(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }

    document.getElementById("empty-message").style.display = "flex";
}

function expand() {
    // TODO minimize button?
    const messageContainer = document.getElementById("messages")
    messageContainer.classList.toggle("stacked")
}