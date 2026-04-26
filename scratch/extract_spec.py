try:
    import docx
    doc = docx.Document(r'd:\clg-event-builder\quest_-the-code-scavenger\QUEST_Master_Spec.docx')
    fullText = []
    for para in doc.paragraphs:
        fullText.append(para.text)
    print('\n'.join(fullText))
except ImportError:
    print("python-docx not installed")
except Exception as e:
    print(f"Error: {e}")
