let accessToken = null;

document.addEventListener('DOMContentLoaded', () => {
  const authButton = document.getElementById('auth-button');
  const mainContainer = document.getElementById('main-container');
  const authContainer = document.getElementById('auth-container');
  const refreshButton = document.getElementById('refresh');
  const processButton = document.getElementById('process');
  const emailList = document.getElementById('email-list');
  const loading = document.getElementById('loading');

  // Check if already authenticated
  chrome.storage.local.get(['accessToken'], (result) => {
    if (result.accessToken) {
      accessToken = result.accessToken;
      showMainInterface();
      fetchUnreadEmails();
    }
  });

  authButton.addEventListener('click', authenticate);
  refreshButton.addEventListener('click', fetchUnreadEmails);
  processButton.addEventListener('click', processSelectedEmails);

  function showMainInterface() {
    authContainer.style.display = 'none';
    mainContainer.style.display = 'block';
  }

  function authenticate() {
    console.log('Starting authentication...');
    chrome.identity.getAuthToken({ 
      interactive: true,
      scopes: [
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.readonly'
      ]
    }, function(token) {
      if (chrome.runtime.lastError) {
        console.error('Authentication error:', chrome.runtime.lastError);
        alert('Authentication failed: ' + chrome.runtime.lastError.message);
        return;
      }
      console.log('Authentication successful');
      accessToken = token;
      chrome.storage.local.set({ accessToken: token });
      showMainInterface();
      fetchUnreadEmails();
    });
  }

  async function fetchUnreadEmails() {
    loading.style.display = 'block';
    emailList.innerHTML = '';

    try {
      console.log('Fetching unread emails from last 7 days...');
      // Calculate date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateString = sevenDaysAgo.toISOString().split('T')[0];

      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread after:${dateString}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      if (!data.messages) {
        emailList.innerHTML = '<p>No unread emails found in the last 7 days!</p>';
        loading.style.display = 'none';
        return;
      }

      console.log(`Found ${data.messages.length} unread emails from last 7 days`);
      for (const message of data.messages) {
        await fetchEmailDetails(message.id);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      if (error.message.includes('401')) {
        // Token expired, need to re-authenticate
        console.log('Token expired, re-authenticating...');
        chrome.identity.removeCachedAuthToken({ token: accessToken }, authenticate);
      } else {
        emailList.innerHTML = `<p>Error: ${error.message}</p>`;
      }
    }
    
    loading.style.display = 'none';
  }

  async function fetchEmailDetails(messageId) {
    try {
      console.log(`Fetching details for email ${messageId}...`);
      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Email details:', data);
      
      const subject = data.payload.headers.find(h => h.name === 'Subject')?.value || '(no subject)';
      const from = data.payload.headers.find(h => h.name === 'From')?.value || '';

      const emailDiv = document.createElement('div');
      emailDiv.className = 'email-item';
      emailDiv.innerHTML = `
        <div class="checkbox-container">
          <input type="checkbox" name="important" data-id="${messageId}">
          <label>Mark as Important</label>
          <input type="checkbox" name="read" data-id="${messageId}">
          <label>Mark as Read</label>
          <span class="delete-checkbox">
            <input type="checkbox" name="delete" data-id="${messageId}">
            <label>Delete Permanently</label>
          </span>
        </div>
        <div>
          <strong>From:</strong> ${from}<br>
          <strong>Subject:</strong> ${subject}
        </div>
      `;

      emailList.appendChild(emailDiv);
    } catch (error) {
      console.error('Error fetching email details:', error);
    }
  }

  async function processSelectedEmails() {
    const importantEmails = Array.from(document.querySelectorAll('input[name="important"]:checked'))
      .map(cb => cb.dataset.id);
    
    const readEmails = Array.from(document.querySelectorAll('input[name="read"]:checked'))
      .map(cb => cb.dataset.id);
    
    const deleteEmails = Array.from(document.querySelectorAll('input[name="delete"]:checked'))
      .map(cb => cb.dataset.id);

    const allEmailIds = new Set([...document.querySelectorAll('input[name="important"]')]
      .map(cb => cb.dataset.id));
    
    const toTrash = Array.from(allEmailIds)
      .filter(id => !importantEmails.includes(id) && !readEmails.includes(id) && !deleteEmails.includes(id));

    loading.style.display = 'block';

    try {
      // Mark emails as important
      for (const id of importantEmails) {
        await modifyEmail(id, { addLabelIds: ['IMPORTANT'] });
      }

      // Mark emails as read
      for (const id of readEmails) {
        await modifyEmail(id, { removeLabelIds: ['UNREAD'] });
      }

      // Permanently delete selected emails
      for (const id of deleteEmails) {
        await permanentlyDeleteEmail(id);
      }

      // Move remaining unselected emails to trash
      for (const id of toTrash) {
        await deleteEmail(id);
      }

      // Refresh the list
      await fetchUnreadEmails();
    } catch (error) {
      console.error('Error processing emails:', error);
    }

    loading.style.display = 'none';
  }

  async function modifyEmail(messageId, modifications) {
    try {
      await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(modifications)
        }
      );
    } catch (error) {
      console.error('Error modifying email:', error);
    }
  }

  async function deleteEmail(messageId) {
    try {
      await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
    } catch (error) {
      console.error('Error deleting email:', error);
    }
  }

  async function permanentlyDeleteEmail(messageId) {
    try {
      await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
    } catch (error) {
      console.error('Error permanently deleting email:', error);
    }
  }
}); 