function createPopupMessage(id, html) {
    const messageContainer = document.getElementById("messages")
    const elements = document.getElementsByClassName("message");

    // only show the latest 3 messages
    if(elements.length >= 3) {
        messageContainer.removeChild(elements.item(elements.length-1))
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
    document.getElementById(id).remove();

    if(document.getElementsByClassName("message").length === 0){
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
    const messageContainer = document.getElementById("messages");

    // only expand if there is actually more than 1 message
    if(document.getElementsByClassName("message").length > 1){
        messageContainer.classList.toggle("stacked");
    }
}

function onCloseClick(event) {
    event.stopPropagation(); //prevents message stack from closing when request is declined (click is not propagated to parent div)

    const targetMessage = event.target.parentNode.dataset.messageId;
    removeMessage(targetMessage);
}